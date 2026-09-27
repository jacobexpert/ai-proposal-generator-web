/** Public API of the documents feature; other features and pages import from here only. */
export { CATEGORY_LABEL, COMPANY_CATEGORIES, CUSTOMER_CATEGORIES, DOCUMENT_CATEGORIES } from "./categories";
export { DocumentUploader, type DocumentUploaderProps } from "./document-uploader";
export { ACCEPTED_EXTENSIONS, MAX_UPLOAD_BYTES } from "./file-rules";
export { ProposalDocumentsUpload } from "./proposal-documents-upload";
export { documentsKey } from "./query-keys";
export type { DocumentCategory, DocumentItem, ProcessingStatus } from "./types";
