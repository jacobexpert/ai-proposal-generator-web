import { createCn } from "cn/config";

/**
 * Class-name merging (shadcn's `cn` engine) taught the design-system font sizes, so
 * `text-caption`, `text-body-sm`, … are not mistaken for text colours and dropped
 * when combined with e.g. `text-info`.
 *
 * Always import `cn` from "@/lib/utils" — never from "cn" directly (ESLint enforces this).
 */
export const cn = createCn({
  extend: {
    theme: {
      text: ["page-title", "panel-title", "body-sm", "caption", "mono-sm"],
    },
  },
});
