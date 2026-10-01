import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: { semi: ["error", "never"], quotes: ["error", "double", { avoidEscape: true }] } },
  globalIgnores([".next/**", "next-env.d.ts"])
])
