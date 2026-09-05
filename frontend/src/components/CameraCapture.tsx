import { useEffect, useRef, useState } from "react";
import { Button, Notice } from "./ui";

/**
 * 웹캠으로 라벨을 촬영해 이미지 File 을 돌려준다 (F-006).
 * Electron(Chromium)·브라우저 모두 navigator.mediaDevices 를 지원한다.
 */
export function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErr("이 환경에서는 카메라를 사용할 수 없습니다. 파일 선택이나 텍스트 입력을 이용하세요.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (e) {
        setErr(
          "카메라를 열지 못했습니다: " +
            String((e as Error).message || e) +
            " (권한을 허용했는지 확인하세요)",
        );
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  function shoot() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `label-${Date.now()}.jpg`, { type: "image/jpeg" }));
        onClose();
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div
      role="dialog"
      aria-label="라벨 촬영"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,8,.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card card-pad"
        style={{ maxWidth: 640, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row spread" style={{ marginBottom: 10 }}>
          <strong>라벨 촬영</strong>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            닫기 ✕
          </button>
        </div>
        {err ? (
          <Notice tone="warn">{err}</Notice>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: "100%",
              borderRadius: "var(--radius-sm)",
              background: "#000",
              aspectRatio: "16/9",
              objectFit: "cover",
            }}
          />
        )}
        <div className="row" style={{ marginTop: 12, gap: "var(--sp-3)" }}>
          <Button variant="primary" onClick={shoot} disabled={!ready || !!err}>
            📷 촬영
          </Button>
          <span className="section-sub">
            라벨 영양성분표가 또렷하게 보이도록 맞춘 뒤 촬영하세요.
          </span>
        </div>
      </div>
    </div>
  );
}
