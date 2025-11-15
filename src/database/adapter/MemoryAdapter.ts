import Document from '../Document.js';
import Query from '../Query.js';
import type {
  Adapter,
  CollectionSchema,
  AttributeSchema,
  IndexSchema
} from './Adapter.js';

interface StoredCollection {
  schema: CollectionSchema;
  documents: Map<string, Document>;
}

export class MemoryAdapter implements Adapter {
  private readonly collections: Map<string, StoredCollection> = new Map();

  public async createCollection(schema: CollectionSchema): Promise<void> {
    const normalised: CollectionSchema = {
      name: schema.name,
      attributes: schema.attributes?.map((attribute) => ({ ...attribute })) ?? [],
      indexes: schema.indexes?.map((index) => ({ ...index })) ?? []
    };

    this.collections.set(schema.name, {
      schema: normalised,
      documents: new Map()
    });
  }

  public async deleteCollection(name: string): Promise<void> {
    this.collections.delete(name);
  }

  public async listCollections(): Promise<CollectionSchema[]> {
    return Array.from(this.collections.values(), (stored) => ({
      name: stored.schema.name,
      attributes: stored.schema.attributes.map((attribute: AttributeSchema) => ({
        ...attribute
      })),
      indexes: stored.schema.indexes?.map((index: IndexSchema) => ({ ...index }))
    }));
  }

  public async createDocument(
    collection: string,
    document: Document
  ): Promise<Document> {
    const stored = this.requireCollection(collection);
    stored.documents.set(document.getId(), document.clone());
    return document.clone();
  }

  public async updateDocument(
    collection: string,
    document: Document
  ): Promise<Document> {
    const stored = this.requireCollection(collection);
    stored.documents.set(document.getId(), document.clone());
    return document.clone();
  }

  public async deleteDocument(collection: string, id: string): Promise<boolean> {
    const stored = this.requireCollection(collection);
    return stored.documents.delete(id);
  }

  public async getDocument(
    collection: string,
    id: string
  ): Promise<Document | null> {
    const stored = this.collections.get(collection);
    if (!stored) {
      return null;
    }

    const document = stored.documents.get(id);
    return document ? document.clone() : null;
  }

  public async listDocuments(
    collection: string,
    queries: Query[]
  ): Promise<Document[]> {
    const stored = this.collections.get(collection);
    if (!stored) {
      return [];
    }

    const documents = Array.from(stored.documents.values(), (doc) => doc.clone());
    return this.applyQueries(documents, queries);
  }

  private applyQueries(documents: Document[], queries: Query[]): Document[] {
    const filters: Query[] = [];
    const order: Array<{ attribute: string; direction: 'asc' | 'desc' }> = [];
    let limit: number | undefined;
    let offset = 0;
    let select: string[] | undefined;

    for (const query of queries) {
      switch (query.getMethod()) {
        case Query.TYPE_LIMIT: {
          const [value] = query.getValues();
          if (typeof value === 'number') {
            limit = value;
          }
          break;
        }
        case Query.TYPE_OFFSET: {
          const [value] = query.getValues();
          if (typeof value === 'number') {
            offset = value;
          }
          break;
        }
        case Query.TYPE_ORDER_ASC:
        case Query.TYPE_ORDER_DESC: {
          order.push({
            attribute: query.getAttribute(),
            direction:
              query.getMethod() === Query.TYPE_ORDER_ASC ? 'asc' : 'desc'
          });
          break;
        }
        case Query.TYPE_SELECT: {
          const values = query.getValues();
          if (values.every((value) => typeof value === 'string')) {
            select = values as string[];
          }
          break;
        }
        default:
          filters.push(query);
          break;
      }
    }

    let result = documents.filter((document) =>
      filters.every((filter) => this.evaluate(document, filter))
    );

    if (order.length > 0) {
      result = [...result].sort((a, b) => this.compareDocuments(a, b, order));
    }

    if (offset) {
      result = result.slice(offset);
    }

    if (typeof limit === 'number') {
      result = result.slice(0, limit);
    }

    if (select && select.length > 0) {
      result = result.map((document) => this.applySelect(document, select!));
    }

    return result;
  }

  private applySelect(document: Document, select: string[]): Document {
    const selected: Record<string, unknown> = {};
    for (const field of select) {
      selected[field] = document.getAttribute(field);
    }

    selected.$id = document.getId();
    selected.$collection = document.getCollection();

    return new Document(selected);
  }

  private compareDocuments(
    a: Document,
    b: Document,
    order: Array<{ attribute: string; direction: 'asc' | 'desc' }>
  ): number {
    for (const { attribute, direction } of order) {
      const aValue = a.getAttribute<unknown>(attribute);
      const bValue = b.getAttribute<unknown>(attribute);

      if (aValue === bValue) {
        continue;
      }

      if (aValue === undefined || aValue === null) {
        return direction === 'asc' ? -1 : 1;
      }

      if (bValue === undefined || bValue === null) {
        return direction === 'asc' ? 1 : -1;
      }

      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }

      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
    }

    return 0;
  }

  private evaluate(document: Document, query: Query): boolean {
    const method = query.getMethod();

    if (method === Query.TYPE_AND || method === Query.TYPE_OR) {
      const values = query.getValues() as Query[];
      return method === Query.TYPE_AND
        ? values.every((nested) => this.evaluate(document, nested))
        : values.some((nested) => this.evaluate(document, nested));
    }

    const attribute = query.getAttribute();
    const value = document.getAttribute<unknown>(attribute);
    const [first, second] = query.getValues();

    switch (method) {
      case Query.TYPE_EQUAL:
        return (query.getValues() as unknown[]).some(
          (candidate) => this.compareValues(value, candidate) === 0
        );
      case Query.TYPE_NOT_EQUAL:
        return (query.getValues() as unknown[]).every(
          (candidate) => this.compareValues(value, candidate) !== 0
        );
      case Query.TYPE_LESS_THAN:
        return this.compareValues(value, first) < 0;
      case Query.TYPE_LESS_THAN_EQUAL:
        return this.compareValues(value, first) <= 0;
      case Query.TYPE_GREATER_THAN:
        return this.compareValues(value, first) > 0;
      case Query.TYPE_GREATER_THAN_EQUAL:
        return this.compareValues(value, first) >= 0;
      case Query.TYPE_CONTAINS:
        return this.containsValue(value, query.getValues());
      case Query.TYPE_NOT_CONTAINS:
        return !this.containsValue(value, query.getValues());
      case Query.TYPE_SEARCH:
        return this.search(value, first as string);
      case Query.TYPE_NOT_SEARCH:
        return !this.search(value, first as string);
      case Query.TYPE_IS_NULL:
        return value === null || value === undefined;
      case Query.TYPE_IS_NOT_NULL:
        return value !== null && value !== undefined;
      case Query.TYPE_BETWEEN:
        return (
          this.compareValues(value, first) >= 0 &&
          this.compareValues(value, second) <= 0
        );
      case Query.TYPE_STARTS_WITH:
        return this.startsWith(value, first as string);
      case Query.TYPE_NOT_STARTS_WITH:
        return !this.startsWith(value, first as string);
      case Query.TYPE_ENDS_WITH:
        return this.endsWith(value, first as string);
      case Query.TYPE_NOT_ENDS_WITH:
        return !this.endsWith(value, first as string);
      default:
        return true;
    }
  }

  private compareValues(a: unknown, b: unknown): number {
    if (a === b) {
      return 0;
    }

    if (a === undefined || a === null) {
      return -1;
    }

    if (b === undefined || b === null) {
      return 1;
    }

    if (typeof a === 'number' && typeof b === 'number') {
      return a - (b as number);
    }

    const aString = String(a);
    const bString = String(b);
    return aString === bString ? 0 : aString > bString ? 1 : -1;
  }

  private containsValue(source: unknown, candidates: unknown[]): boolean {
    if (Array.isArray(source)) {
      return candidates.every((candidate) =>
        source.some((item) => this.compareValues(item, candidate) === 0)
      );
    }

    return candidates.some(
      (candidate) => this.compareValues(source, candidate) === 0
    );
  }

  private search(source: unknown, needle: string): boolean {
    if (typeof source !== 'string') {
      return false;
    }

    return source.toLowerCase().includes(needle.toLowerCase());
  }

  private startsWith(source: unknown, prefix: string): boolean {
    return typeof source === 'string' && source.startsWith(prefix);
  }

  private endsWith(source: unknown, suffix: string): boolean {
    return typeof source === 'string' && source.endsWith(suffix);
  }

  private requireCollection(name: string): StoredCollection {
    const collection = this.collections.get(name);
    if (!collection) {
      throw new Error(`Collection '${name}' does not exist`);
    }

    return collection;
  }
}

export default MemoryAdapter;
