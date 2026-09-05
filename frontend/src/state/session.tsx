import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import type { AnalyzeResponse, Product, Selection } from "../api/types";
import { DEFAULT_AMOUNTS } from "../lib/calc";

export interface Profile {
  healthNotes?: string;
  shelter?: string;
  cage?: string;
  arrival?: string;
  shelterStatus?: string;
  name: string;
  weight: number;
  age: number;
  breed: string;
  neutered: boolean;
}

interface SelState {
  daily_amount_g: number;
  active: boolean;
}

interface State {
  profile: Profile;
  catalog: Product[];
  extras: Product[];
  sel: Record<string, SelState>;
  search: string;
  loadError: string | null;
  ready: boolean;
}

type Action =
  | { type: "loaded"; catalog: Product[] }
  | { type: "loadError"; message: string }
  | { type: "profile"; patch: Partial<Profile> }
  | { type: "search"; value: string }
  | { type: "setActive"; id: string; active: boolean }
  | { type: "setAmount"; id: string; amount: number }
  | { type: "addProduct"; product: Product }
  | { type: "removeExtras" }
  | {
      type: "restore";
      profile: Partial<Profile>;
      products: Product[];
      selections: Selection[];
    };

const initialProfile: Profile = {
  name: "몽이",
  weight: 8,
  age: 5,
  breed: "",
  neutered: false,
};

function ensureSel(sel: Record<string, SelState>, products: Product[]): Record<string, SelState> {
  const next = { ...sel };
  for (const p of products) {
    if (!next[p.product_id]) {
      next[p.product_id] = {
        daily_amount_g: DEFAULT_AMOUNTS[p.product_id] ?? 50,
        active: false, // 카탈로그 제품은 사용자가 "먹이는 제품"에 추가할 때만 활성화
      };
    }
  }
  return next;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loaded":
      return {
        ...state,
        catalog: action.catalog,
        sel: ensureSel(state.sel, action.catalog),
        ready: true,
        loadError: null,
      };
    case "loadError":
      return { ...state, loadError: action.message, ready: true };
    case "profile":
      return { ...state, profile: { ...state.profile, ...action.patch } };
    case "search":
      return { ...state, search: action.value };
    case "setActive":
      return {
        ...state,
        sel: {
          ...state.sel,
          [action.id]: { ...state.sel[action.id], active: action.active },
        },
      };
    case "setAmount":
      return {
        ...state,
        sel: {
          ...state.sel,
          [action.id]: {
            ...state.sel[action.id],
            daily_amount_g: Math.max(0, action.amount),
          },
        },
      };
    case "addProduct": {
      const extras = [
        ...state.extras.filter((p) => p.product_id !== action.product.product_id),
        action.product,
      ];
      const id = action.product.product_id;
      return {
        ...state,
        extras,
        sel: {
          ...state.sel,
          [id]: {
            daily_amount_g: state.sel[id]?.daily_amount_g ?? DEFAULT_AMOUNTS[id] ?? 50,
            active: true, // 라벨/직접 추가한 제품은 바로 급여 목록에 들어간다
          },
        },
      };
    }
    case "removeExtras": {
      const sel = { ...state.sel };
      for (const p of state.extras) delete sel[p.product_id];
      return { ...state, extras: [], sel };
    }
    case "restore": {
      const catalogIds = new Set(state.catalog.map((p) => p.product_id));
      const extras = action.products.filter((p) => !catalogIds.has(p.product_id));
      const sel: Record<string, SelState> = ensureSel(
        {},
        [...state.catalog, ...extras],
      );
      for (const s of action.selections) {
        sel[s.product_id] = { daily_amount_g: s.daily_amount_g, active: s.active };
      }
      return {
        ...state,
        profile: { ...state.profile, ...action.profile },
        extras,
        sel,
      };
    }
    default:
      return state;
  }
}

interface Ctx {
  state: State;
  dispatch: React.Dispatch<Action>;
  allProducts: Product[];
  filtered: Product[];
  selections: Selection[];
  analysis: { data: AnalyzeResponse | null; loading: boolean; error: string | null };
  inactiveIds: string[];
}

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    profile: initialProfile,
    catalog: [],
    extras: [],
    sel: {},
    search: "",
    loadError: null,
    ready: false,
  });

  useEffect(() => {
    let alive = true;
    api
      .catalogProducts()
      .then((catalog) => alive && dispatch({ type: "loaded", catalog }))
      .catch((e) => alive && dispatch({ type: "loadError", message: String(e.message || e) }));
    return () => {
      alive = false;
    };
  }, []);

  const allProducts = useMemo(
    () => [...state.catalog, ...state.extras],
    [state.catalog, state.extras],
  );

  const filtered = useMemo(() => {
    const q = state.search.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    );
  }, [allProducts, state.search]);

  const selections: Selection[] = useMemo(
    () =>
      allProducts.map((p) => ({
        product_id: p.product_id,
        daily_amount_g: state.sel[p.product_id]?.daily_amount_g ?? 1,
        active: state.sel[p.product_id]?.active ?? true,
      })),
    [allProducts, state.sel],
  );

  const inactiveIds = useMemo(
    () => selections.filter((s) => !s.active).map((s) => s.product_id),
    [selections],
  );

  const analysis = useAnalyze(allProducts, selections);

  const value: Ctx = {
    state,
    dispatch,
    allProducts,
    filtered,
    selections,
    analysis,
    inactiveIds,
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Ctx {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

/** 조합이 바뀌면 250ms 디바운스 후 세션 분석 API를 호출한다. */
function useAnalyze(products: Product[], selections: Selection[]) {
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify({
    p: products.map((p) => p.product_id),
    s: selections,
  });
  const timer = useRef<number>();

  useEffect(() => {
    if (products.length === 0) {
      setData(null);
      return;
    }
    window.clearTimeout(timer.current);
    setLoading(true);
    timer.current = window.setTimeout(() => {
      api
        .analyze(products, selections)
        .then((res) => {
          setData(res);
          setError(null);
        })
        .catch((e) => setError(String(e.message || e)))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading, error };
}
