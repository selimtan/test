export type DocumentData = Record<string, unknown>;

const RESERVED_KEYS = new Set([
  '$id',
  '$collection',
  '$createdAt',
  '$updatedAt',
  '$permissions',
  '$tenant',
  '$sequence'
]);

const PERMISSION_TYPES = [
  'create',
  'read',
  'update',
  'delete'
] as const;

export class Document {
  private readonly data: DocumentData;

  constructor(input: DocumentData = {}) {
    this.data = {};
    this.replace(input);
  }

  public getId(): string {
    return (this.data.$id as string) ?? '';
  }

  public getCollection(): string {
    return (this.data.$collection as string) ?? '';
  }

  public getPermissions(): string[] {
    const permissions = (this.data.$permissions as string[] | undefined) ?? [];
    return Array.from(new Set(permissions));
  }

  public getRead(): string[] {
    return this.getPermissionsByType('read');
  }

  public getCreate(): string[] {
    return this.getPermissionsByType('create');
  }

  public getUpdate(): string[] {
    return this.getPermissionsByType('update');
  }

  public getDelete(): string[] {
    return this.getPermissionsByType('delete');
  }

  public getAttribute<T>(key: string, defaultValue?: T): T | undefined {
    if (!Object.prototype.hasOwnProperty.call(this.data, key)) {
      return defaultValue;
    }

    const value = this.data[key];
    return value as T;
  }

  public setAttribute(key: string, value: unknown): this {
    this.data[key] = this.prepareValue(value);
    return this;
  }

  public removeAttribute(key: string): this {
    delete this.data[key];
    return this;
  }

  public toJSON(): DocumentData {
    const result: DocumentData = {};

    for (const [key, value] of Object.entries(this.data)) {
      if (value instanceof Document) {
        result[key] = value.toJSON();
        continue;
      }

      if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          item instanceof Document ? item.toJSON() : item
        );
        continue;
      }

      result[key] = value;
    }

    return result;
  }

  public clone(): Document {
    return new Document(this.toJSON());
  }

  public getAttributes(): DocumentData {
    const attributes: DocumentData = {};

    for (const [key, value] of Object.entries(this.data)) {
      if (RESERVED_KEYS.has(key)) {
        continue;
      }

      attributes[key] = value;
    }

    return attributes;
  }

  private getPermissionsByType(type: (typeof PERMISSION_TYPES)[number]): string[] {
    const prefix = `${type}(`;
    return this.getPermissions()
      .filter((permission) => permission.startsWith(prefix))
      .map((permission) => permission.slice(prefix.length, -1));
  }

  private replace(input: DocumentData): void {
    for (const [key, value] of Object.entries(input)) {
      if (key === '$id' && value !== undefined && value !== null) {
        if (typeof value !== 'string') {
          throw new TypeError('$id must be of type string');
        }
        this.data[key] = value;
        continue;
      }

      if (key === '$permissions' && value !== undefined && value !== null) {
        if (!Array.isArray(value)) {
          throw new TypeError('$permissions must be an array');
        }
        this.data[key] = value.map(String);
        continue;
      }

      this.data[key] = this.prepareValue(value);
    }
  }

  private prepareValue(value: unknown): unknown {
    if (value instanceof Document) {
      return value.clone();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.prepareValue(item));
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if ('$id' in record || '$collection' in record) {
        return new Document(record).clone();
      }

      const cloned: Record<string, unknown> = {};
      for (const [childKey, childValue] of Object.entries(record)) {
        cloned[childKey] = this.prepareValue(childValue);
      }
      return cloned;
    }

    return value;
  }
}

export default Document;
