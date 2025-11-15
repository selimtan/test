import Document, { type DocumentData } from './Document.js';
import Query from './Query.js';
import type Adapter from './adapter/Adapter.js';
import type { CollectionSchema } from './adapter/Adapter.js';

export interface CreateDocumentOptions {
  id?: string;
  permissions?: string[];
}

export interface ListDocumentsOptions {
  queries?: Query[];
}

export class Database {
  private namespace = 'default';

  constructor(private readonly adapter: Adapter) {}

  public setNamespace(namespace: string): void {
    this.namespace = namespace;
  }

  public getNamespace(): string {
    return this.namespace;
  }

  public async createCollection(schema: CollectionSchema): Promise<void> {
    await this.adapter.createCollection(schema);
  }

  public async deleteCollection(name: string): Promise<void> {
    await this.adapter.deleteCollection(name);
  }

  public async listCollections(): Promise<CollectionSchema[]> {
    return this.adapter.listCollections();
  }

  public async createDocument(
    collection: string,
    data: DocumentData,
    options: CreateDocumentOptions = {}
  ): Promise<Document> {
    const now = new Date().toISOString();
    const id = options.id ?? this.generateId();
    const payload: DocumentData = {
      ...data,
      $id: id,
      $collection: collection,
      $createdAt: now,
      $updatedAt: now
    };

    if (options.permissions) {
      payload.$permissions = [...options.permissions];
    }

    const document = new Document(payload);
    return this.adapter.createDocument(collection, document);
  }

  public async updateDocument(
    collection: string,
    id: string,
    data: DocumentData
  ): Promise<Document> {
    const existing = await this.adapter.getDocument(collection, id);
    if (!existing) {
      throw new Error(`Document '${id}' not found in collection '${collection}'`);
    }

    const merged = existing.toJSON();
    for (const [key, value] of Object.entries(data)) {
      merged[key] = value;
    }

    merged.$updatedAt = new Date().toISOString();

    const document = new Document(merged);
    return this.adapter.updateDocument(collection, document);
  }

  public async getDocument(collection: string, id: string): Promise<Document | null> {
    return this.adapter.getDocument(collection, id);
  }

  public async deleteDocument(collection: string, id: string): Promise<boolean> {
    return this.adapter.deleteDocument(collection, id);
  }

  public async listDocuments(
    collection: string,
    options: ListDocumentsOptions = {}
  ): Promise<Document[]> {
    const queries = options.queries ?? [];
    return this.adapter.listDocuments(collection, queries.map((query) => query.clone()));
  }

  private generateId(): string {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
  }
}

export default Database;
