import unittest
import warnings
from streamlit.testing.v1 import AppTest

# Streamlit AppTest bare-mode 경고는 테스트 run 중 일반적이라 무시한다.
warnings.filterwarnings("ignore", message=".*ScriptRunContext.*")


def _widget_label(elem):
    """Metric/Expander/Caption 등의 표시 라벨을 반환한다.

    AppTest 위젯은 종류에 따라 .label / .value 에 텍스트를 담는다.
    - Metric: .label('활성 제품'), .value('4개')
    - Expander: .label('📷 라벨 업로드...')
    - Warning: .value(경고 문구)
    """
    if elem is None:
        return ""
    for attr in ("label", "value", "name", "title"):
        try:
            v = getattr(elem, attr, None)
            if isinstance(v, str) and v.strip():
                return v
        except Exception:
            pass
    # fallback: root 텍스트
    try:
        if hasattr(elem, "root") and elem.root is not None:
            if hasattr(elem.root, "text") and isinstance(elem.root.text, str):
                return elem.root.text
    except Exception:
        pass
    return ""


def _any_widget_text_contains(elements, needle: str) -> bool:
    return any(needle in _widget_label(e) for e in elements if e is not None)


class FrontendFeatureTests(unittest.TestCase):
    RUN_TIMEOUT = 15


class ProductSearchTests(FrontendFeatureTests):
    def test_search_box_exists(self):
        """F-005: 검색창이 렌더링된다."""
        at = AppTest.from_file("legacy/app.py")
        at.run(timeout=self.RUN_TIMEOUT)
        text_inputs = [ti for ti in at.text_input if ti.root is not None]
        self.assertTrue(len(text_inputs) >= 1,
                        f"텍스트 입력이 없다. 개수={len(text_inputs)}")

    def test_search_filters_catalog(self):
        """F-005: 검색어를 입력하면 제품 목록이 필터링된다."""
        at = AppTest.from_file("legacy/app.py")
        at.run(timeout=self.RUN_TIMEOUT)
        target = None
        for ti in at.text_input:
            if _widget_label(ti) and "검색" in _widget_label(ti):
                target = ti
                break
        if target is None:
            target = at.text_input[-1] if at.text_input else None
        if target is None:
            self.skipTest("검색 텍스트 입력을 찾지 못했다")
        target.set_value("사료")
        at.run(timeout=self.RUN_TIMEOUT)
        found = _any_widget_text_contains(at.caption, "검색 결과")
        self.assertTrue(found,
                        f"검색 결과 수 캡션이 없다. captions={[ _widget_label(c) for c in at.caption]}")


class CostComparisonTests(FrontendFeatureTests):
    def test_monthly_cost_metrics_exist(self):
        """F-020: 월 예상 비용 비교 섹션과 총 비용 지표가 존재한다."""
        at = AppTest.from_file("legacy/app.py")
        at.run(timeout=self.RUN_TIMEOUT)
        self.assertTrue(
            _any_widget_text_contains(at.metric, "일일 비용"),
            f"일일 비용 지표 없음. metrics={[ _widget_label(m) for m in at.metric]}")
        self.assertTrue(
            _any_widget_text_contains(at.metric, "월간 비용"),
            f"월간 비용 지표 없음. metrics={[ _widget_label(m) for m in at.metric]}")


class ReportPanelTests(FrontendFeatureTests):
    def test_report_expander_exists(self):
        """F-022: 결과 리포트 펼침 메뉴가 존재한다."""
        at = AppTest.from_file("legacy/app.py")
        at.run(timeout=self.RUN_TIMEOUT)
        self.assertTrue(
            _any_widget_text_contains(at.expander, "리포트"),
            "결과 리포트 expander가 없다")

    def test_report_contains_medical_disclaimer(self):
        """F-033: 결과 리포트에 의료 범위 고지가 포함된다."""
        at = AppTest.from_file("legacy/app.py")
        at.run(timeout=self.RUN_TIMEOUT)
        target = None
        for e in at.expander:
            if "리포트" in _widget_label(e):
                target = e
                break
        if target is None:
            self.skipTest("리포트 expander를 찾지 못했다")
        target.run(timeout=self.RUN_TIMEOUT)
        # target.run() 이후 at를 다시 실행해 expander 내부 위젯 목록을 갱신
        at.run(timeout=self.RUN_TIMEOUT)
        warnings_in_expander = [w for w in target.warning if w is not None]
        self.assertTrue(
            len(warnings_in_expander) >= 1,
            f"리포트 안에 의료 범위 고지가 없다. warnings={[ _widget_label(w) for w in warnings_in_expander]}")


class ExclusionComparisonTests(FrontendFeatureTests):
    def test_exclusion_compared_display(self):
        """F-018: 제품을 제외했을 때 전후 비교 UI가 나타난다."""
        at = AppTest.from_file("legacy/app.py")
        at.run(timeout=self.RUN_TIMEOUT)
        checkboxes = [c for c in at.checkbox if c.root is not None]
        if not checkboxes:
            self.skipTest("활성 체크박스가 없어 제외 전후 비교를 검증할 수 없다")
        # 첫 번째 제품을 비활성화
        checkboxes[0].set_value(False)
        at.run(timeout=self.RUN_TIMEOUT)
        self.assertTrue(
            _any_widget_text_contains(at.subheader, "비교"),
            f"제외 전후 비교 subheader가 없다. subheaders={[ _widget_label(s) for s in at.subheader]}")


class FrontendSmokeTests(FrontendFeatureTests):
    def test_initial_metrics(self):
        """초기 렌더링 지표: 활성 제품·확인 필요·정보 부족 수 표시."""
        at = AppTest.from_file("legacy/app.py")
        at.run(timeout=self.RUN_TIMEOUT)
        metrics = [m for m in at.metric if m is not None]
        self.assertTrue(len(metrics) >= 4,
                        f"초기 지표 4개가 표시되지 않았다. metrics={[ _widget_label(m) for m in metrics]}")


if __name__ == "__main__":
    unittest.main()
