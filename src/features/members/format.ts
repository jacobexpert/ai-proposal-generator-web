const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

/** "Sep 27, 2026"; the raw value when the API sends something unparsable. */
export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date);
}

export const OWNER_REQUIRED_MESSAGE = "A workspace must have at least one owner. Make someone else an owner first.";
