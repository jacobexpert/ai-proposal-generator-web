import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * Teach tailwind-merge the design-system font sizes (`text-caption`, …) so they are not
 * mistaken for text colours and dropped when combined with e.g. `text-info`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["page-title", "panel-title", "body-sm", "caption", "mono-sm"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
