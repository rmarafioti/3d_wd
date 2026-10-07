// Vitest config (see CLAUDE.md → Unit Tests). jsdom stands in for the browser; every mock and
// stubbed global is reset after each test so tests never share state.

import { transformWithOxc } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Next.js pages and layouts are .js files containing JSX (page.js, layout.js), which Vite only
// parses as JSX in .jsx files. This parses JSX in our own .js files for the tests; Next.js's
// own build is unaffected.
const jsxInJs = {
  name: "jsx-in-js",
  enforce: "pre",
  transform(code, id) {
    if (!/\/src\/.*\.js$/.test(id)) return null;
    return transformWithOxc(code, id, {
      lang: "jsx",
      jsx: { runtime: "automatic" },
    });
  },
};

export default defineConfig({
  plugins: [jsxInJs, react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
  },
});
