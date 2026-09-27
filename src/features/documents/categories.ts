import type { DocumentCategory } from "./types";

/** Spec §7.2 / US-BE-07: customer-side categories first, then company knowledge. */
export const CUSTOMER_CATEGORIES = [
  "RFP",
  "RFI",
  "CUSTOMER_REQUIREMENT",
  "MEETING_NOTE",
] as const satisfies readonly DocumentCategory[];
export const COMPANY_CATEGORIES = [
  "COMPANY_PROFILE",
  "REFERENCE_PROPOSAL",
  "SERVICE_CATALOG",
  "ARCHITECTURE_REFERENCE",
  "PRICING_REFERENCE",
] as const satisfies readonly DocumentCategory[];

export const DOCUMENT_CATEGORIES = [
  ...CUSTOMER_CATEGORIES,
  ...COMPANY_CATEGORIES,
  "OTHER",
] as const satisfies readonly DocumentCategory[];

export const CATEGORY_LABEL: Record<DocumentCategory, string> = {
  RFP: "RFP",
  RFI: "RFI",
  CUSTOMER_REQUIREMENT: "Customer requirement",
  MEETING_NOTE: "Meeting note",
  COMPANY_PROFILE: "Company profile",
  REFERENCE_PROPOSAL: "Reference proposal",
  SERVICE_CATALOG: "Service catalog",
  ARCHITECTURE_REFERENCE: "Architecture reference",
  PRICING_REFERENCE: "Pricing reference",
  OTHER: "Other",
};

export function isCustomerCategory(category: DocumentCategory): boolean {
  return (CUSTOMER_CATEGORIES as readonly DocumentCategory[]).includes(category);
}
