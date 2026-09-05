import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 개발 중에는 Vite(5173)가 UI를, FastAPI(8756)가 API를 담당한다.
// 프로덕션 빌드(dist/)는 FastAPI가 정적 파일로 직접 서빙한다.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8756",
      "/health": "http://127.0.0.1:8756",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
