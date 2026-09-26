import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // shadcn components are generated with `import { cn } from "cn"`; the project wrapper in
    // src/lib/utils.ts knows the design-system font sizes, so everything must use it.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/utils.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "cn", message: 'Import { cn } from "@/lib/utils" instead (design-system aware).' }],
          patterns: [
            { group: ["next/font/google"], message: "Fonts are self-hosted via @fontsource (design system)." },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
