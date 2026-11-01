import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";

export default tseslint.config([
  globalIgnores(["dist", "coverage"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      // react-hooks v7 ships the compiler-era rules. The codebase passes
      // purity, immutability, set-state-in-render and the rest of the suite
      // cleanly — except these two, which flag the deliberate patterns this
      // app relies on: "latest-value mirror" refs written during render so
      // event handlers always see the last completed render's props (see
      // CsvTable.tsx latestRef/viewRef and App.tsx converterStateRef), and
      // derived-state-resync effects that are part of the established
      // outside-click/selection flows. The sanctioned replacements
      // (useEffectEvent et al.) are React 19-era APIs — React is pinned to
      // 18 here by glide-data-grid's peer range — so adopting these rules
      // is a deliberate refactor of its own, not part of a toolchain
      // migration. Revisit when React 19 is unlocked.
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
