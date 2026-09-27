import type { Schema } from "@/lib/api/typed-client";

/** A document as returned by the API (`DocumentResponse`, US-BE-07). */
export type DocumentItem = Schema<"DocumentResponse">;
export type DocumentCategory = NonNullable<DocumentItem["category"]>;
export type ProcessingStatus = NonNullable<DocumentItem["processingStatus"]>;
