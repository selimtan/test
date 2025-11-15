export { default as Document, type DocumentData } from './database/Document.js';
export { default as Query, type QueryJSON, type QueryValue } from './database/Query.js';
export { default as Database, type CreateDocumentOptions, type ListDocumentsOptions } from './database/Database.js';
export type {
  Adapter,
  CollectionSchema,
  AttributeSchema,
  IndexSchema
} from './database/adapter/Adapter.js';
export { default as MemoryAdapter } from './database/adapter/MemoryAdapter.js';
