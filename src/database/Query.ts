import Document from './Document.js';

export type QueryValue = unknown;

export interface QueryJSON {
  method: string;
  attribute?: string;
  values?: Array<QueryJSON | QueryValue>;
}

export class Query {
  public static readonly TYPE_EQUAL = 'equal';
  public static readonly TYPE_NOT_EQUAL = 'notEqual';
  public static readonly TYPE_LESS_THAN = 'lessThan';
  public static readonly TYPE_LESS_THAN_EQUAL = 'lessThanEqual';
  public static readonly TYPE_GREATER_THAN = 'greaterThan';
  public static readonly TYPE_GREATER_THAN_EQUAL = 'greaterThanEqual';
  public static readonly TYPE_CONTAINS = 'contains';
  public static readonly TYPE_NOT_CONTAINS = 'notContains';
  public static readonly TYPE_SEARCH = 'search';
  public static readonly TYPE_NOT_SEARCH = 'notSearch';
  public static readonly TYPE_IS_NULL = 'isNull';
  public static readonly TYPE_IS_NOT_NULL = 'isNotNull';
  public static readonly TYPE_BETWEEN = 'between';
  public static readonly TYPE_STARTS_WITH = 'startsWith';
  public static readonly TYPE_NOT_STARTS_WITH = 'notStartsWith';
  public static readonly TYPE_ENDS_WITH = 'endsWith';
  public static readonly TYPE_NOT_ENDS_WITH = 'notEndsWith';
  public static readonly TYPE_LIMIT = 'limit';
  public static readonly TYPE_OFFSET = 'offset';
  public static readonly TYPE_ORDER_ASC = 'orderAsc';
  public static readonly TYPE_ORDER_DESC = 'orderDesc';
  public static readonly TYPE_SELECT = 'select';
  public static readonly TYPE_AND = 'and';
  public static readonly TYPE_OR = 'or';

  private static readonly LOGICAL_METHODS = new Set([
    Query.TYPE_AND,
    Query.TYPE_OR
  ]);

  private static readonly VALID_METHODS = new Set([
    Query.TYPE_EQUAL,
    Query.TYPE_NOT_EQUAL,
    Query.TYPE_LESS_THAN,
    Query.TYPE_LESS_THAN_EQUAL,
    Query.TYPE_GREATER_THAN,
    Query.TYPE_GREATER_THAN_EQUAL,
    Query.TYPE_CONTAINS,
    Query.TYPE_NOT_CONTAINS,
    Query.TYPE_SEARCH,
    Query.TYPE_NOT_SEARCH,
    Query.TYPE_IS_NULL,
    Query.TYPE_IS_NOT_NULL,
    Query.TYPE_BETWEEN,
    Query.TYPE_STARTS_WITH,
    Query.TYPE_NOT_STARTS_WITH,
    Query.TYPE_ENDS_WITH,
    Query.TYPE_NOT_ENDS_WITH,
    Query.TYPE_LIMIT,
    Query.TYPE_OFFSET,
    Query.TYPE_ORDER_ASC,
    Query.TYPE_ORDER_DESC,
    Query.TYPE_SELECT,
    Query.TYPE_AND,
    Query.TYPE_OR
  ]);

  public static isMethod(value: string): boolean {
    return Query.VALID_METHODS.has(value);
  }

  public static parse(value: string): Query {
    const parsed = JSON.parse(value) as QueryJSON;
    return Query.fromJSON(parsed);
  }

  public static fromJSON(json: QueryJSON): Query {
    const method = json.method;
    if (!Query.isMethod(method)) {
      throw new Error(`Invalid query method: ${method}`);
    }

    const attribute = json.attribute ?? '';
    const values = (json.values ?? []).map((entry) => {
      if (Query.LOGICAL_METHODS.has(method)) {
        return Query.fromJSON(entry as QueryJSON);
      }
      return entry;
    });

    return new Query(method, attribute, values);
  }

  public static equal(attribute: string, values: QueryValue[]): Query {
    return new Query(Query.TYPE_EQUAL, attribute, values);
  }

  public static notEqual(attribute: string, value: QueryValue): Query {
    return new Query(
      Query.TYPE_NOT_EQUAL,
      attribute,
      Array.isArray(value) ? (value as QueryValue[]) : [value]
    );
  }

  public static lessThan(attribute: string, value: QueryValue): Query {
    return new Query(Query.TYPE_LESS_THAN, attribute, [value]);
  }

  public static lessThanEqual(attribute: string, value: QueryValue): Query {
    return new Query(Query.TYPE_LESS_THAN_EQUAL, attribute, [value]);
  }

  public static greaterThan(attribute: string, value: QueryValue): Query {
    return new Query(Query.TYPE_GREATER_THAN, attribute, [value]);
  }

  public static greaterThanEqual(attribute: string, value: QueryValue): Query {
    return new Query(Query.TYPE_GREATER_THAN_EQUAL, attribute, [value]);
  }

  public static contains(attribute: string, value: QueryValue): Query {
    return new Query(
      Query.TYPE_CONTAINS,
      attribute,
      Array.isArray(value) ? (value as QueryValue[]) : [value]
    );
  }

  public static notContains(attribute: string, value: QueryValue): Query {
    return new Query(
      Query.TYPE_NOT_CONTAINS,
      attribute,
      Array.isArray(value) ? (value as QueryValue[]) : [value]
    );
  }

  public static search(attribute: string, value: string): Query {
    return new Query(Query.TYPE_SEARCH, attribute, [value]);
  }

  public static notSearch(attribute: string, value: string): Query {
    return new Query(Query.TYPE_NOT_SEARCH, attribute, [value]);
  }

  public static isNull(attribute: string): Query {
    return new Query(Query.TYPE_IS_NULL, attribute, []);
  }

  public static isNotNull(attribute: string): Query {
    return new Query(Query.TYPE_IS_NOT_NULL, attribute, []);
  }

  public static between(attribute: string, start: QueryValue, end: QueryValue): Query {
    return new Query(Query.TYPE_BETWEEN, attribute, [start, end]);
  }

  public static startsWith(attribute: string, value: string): Query {
    return new Query(Query.TYPE_STARTS_WITH, attribute, [value]);
  }

  public static notStartsWith(attribute: string, value: string): Query {
    return new Query(Query.TYPE_NOT_STARTS_WITH, attribute, [value]);
  }

  public static endsWith(attribute: string, value: string): Query {
    return new Query(Query.TYPE_ENDS_WITH, attribute, [value]);
  }

  public static notEndsWith(attribute: string, value: string): Query {
    return new Query(Query.TYPE_NOT_ENDS_WITH, attribute, [value]);
  }

  public static limit(value: number): Query {
    return new Query(Query.TYPE_LIMIT, '', [value]);
  }

  public static offset(value: number): Query {
    return new Query(Query.TYPE_OFFSET, '', [value]);
  }

  public static orderAsc(attribute: string): Query {
    return new Query(Query.TYPE_ORDER_ASC, attribute, []);
  }

  public static orderDesc(attribute: string): Query {
    return new Query(Query.TYPE_ORDER_DESC, attribute, []);
  }

  public static select(fields: string[]): Query {
    return new Query(Query.TYPE_SELECT, '', fields);
  }

  public static and(queries: Query[]): Query {
    return new Query(Query.TYPE_AND, '', queries);
  }

  public static or(queries: Query[]): Query {
    return new Query(Query.TYPE_OR, '', queries);
  }

  private readonly method: string;
  private readonly attribute: string;
  private readonly values: QueryValue[];

  constructor(method: string, attribute: string, values: QueryValue[]) {
    this.method = method;
    this.attribute = attribute;
    this.values = Query.LOGICAL_METHODS.has(method)
      ? values.map((value) => {
          if (value instanceof Query) {
            return value.clone();
          }

          if (typeof value === 'object' && value !== null) {
            return Query.fromJSON(value as QueryJSON);
          }

          throw new TypeError('Logical queries must contain Query instances');
        })
      : values;
  }

  public clone(): Query {
    return new Query(this.method, this.attribute, this.values);
  }

  public getMethod(): string {
    return this.method;
  }

  public getAttribute(): string {
    return this.attribute;
  }

  public getValues(): QueryValue[] {
    return this.values;
  }

  public toJSON(): QueryJSON {
    const result: QueryJSON = { method: this.method };
    if (this.attribute) {
      result.attribute = this.attribute;
    }

    if (Query.LOGICAL_METHODS.has(this.method)) {
      result.values = this.values.map((value) => (value as Query).toJSON());
    } else {
      result.values = this.values.map((value) =>
        value instanceof Document ? value.getId() : value
      );
    }

    return result;
  }

  public toString(): string {
    return JSON.stringify(this.toJSON());
  }
}

export default Query;
