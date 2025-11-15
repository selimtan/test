import Document from '../Document.js';
import Query from '../Query.js';

export interface AttributeSchema {
  key: string;
  type: string;
  required?: boolean;
  default?: unknown;
}

export interface IndexSchema {
  key: string;
  attributes: string[];
  type?: string;
}

export interface CollectionSchema {
  name: string;
  attributes: AttributeSchema[];
  indexes?: IndexSchema[];
}

export interface Adapter {
  createCollection(schema: CollectionSchema): Promise<void>;
  deleteCollection(name: string): Promise<void>;
  listCollections(): Promise<CollectionSchema[]>;
  createDocument(collection: string, document: Document): Promise<Document>;
  updateDocument(collection: string, document: Document): Promise<Document>;
  deleteDocument(collection: string, id: string): Promise<boolean>;
  getDocument(collection: string, id: string): Promise<Document | null>;
  listDocuments(collection: string, queries: Query[]): Promise<Document[]>;
}

export default Adapter;
