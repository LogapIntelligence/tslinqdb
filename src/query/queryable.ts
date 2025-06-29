import { ExpressionParser } from './expression-parser';

export class Queryable<T> {
  private filters: ((item: T) => boolean)[] = [];
  private sortKeys: { extractor: (item: T) => any; desc: boolean }[] = [];
  private skipCount = 0;
  private takeCount?: number;
  private includeRelations: string[] = [];
  private selectFields?: string[];
  private projection?: (item: T) => any;

  constructor(
    private dbContext: any,
    private entityType: new () => T,
    private tableName: string
  ) {}

  where(predicate: (item: T) => boolean): Queryable<T> {
    const newQuery = this.clone();
    const compiled = ExpressionParser.compile(predicate);
    newQuery.filters.push(compiled);
    return newQuery;
  }

  select<R>(selector: (item: T) => R): Queryable<R> {
    const newQuery = this.clone() as any;
    newQuery.projection = ExpressionParser.compile(selector);
    return newQuery;
  }

  orderBy(selector: (item: T) => any): Queryable<T> {
    const newQuery = this.clone();
    const extractor = ExpressionParser.compile(selector);
    newQuery.sortKeys.push({ extractor, desc: false });
    return newQuery;
  }

  orderByDescending(selector: (item: T) => any): Queryable<T> {
    const newQuery = this.clone();
    const extractor = ExpressionParser.compile(selector);
    newQuery.sortKeys.push({ extractor, desc: true });
    return newQuery;
  }

  skip(count: number): Queryable<T> {
    const newQuery = this.clone();
    newQuery.skipCount = count;
    return newQuery;
  }

  take(count: number): Queryable<T> {
    const newQuery = this.clone();
    newQuery.takeCount = count;
    return newQuery;
  }

  include(selector: (item: T) => any): Queryable<T> {
    const newQuery = this.clone();
    const relation = ExpressionParser.extractPropertyPath(selector);
    newQuery.includeRelations.push(relation);
    return newQuery;
  }

  async toArray(): Promise<T[]> {
    let results = await this.dbContext.getData(this.tableName);
    
    // Apply filters
    for (const filter of this.filters) {
      results = results.filter(filter);
    }
    
    // Apply sorting
    for (const sort of this.sortKeys) {
      results.sort((a: any, b: any) => {
        const aVal = sort.extractor(a);
        const bVal = sort.extractor(b);
        const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sort.desc ? -result : result;
      });
    }
    
    // Apply skip/take
    if (this.skipCount > 0) {
      results = results.slice(this.skipCount);
    }
    if (this.takeCount !== undefined) {
      results = results.slice(0, this.takeCount);
    }
    
    // Load relations
    if (this.includeRelations.length > 0) {
      results = await this.loadRelations(results);
    }
    
    // Apply projection
    if (this.projection) {
      results = results.map(this.projection);
    }
    
    return results;
  }

  async first(): Promise<T | null> {
    const results = await this.take(1).toArray();
    return results[0] || null;
  }

  async firstOrDefault(defaultValue: T): Promise<T> {
    const result = await this.first();
    return result || defaultValue;
  }

  async single(): Promise<T> {
    const results = await this.toArray();
    if (results.length !== 1) {
      throw new Error('Sequence contains more than one element');
    }
    return results[0];
  }

  async count(): Promise<number> {
    const results = await this.toArray();
    return results.length;
  }

  async any(predicate?: (item: T) => boolean): Promise<boolean> {
    if (predicate) {
      const results = await this.where(predicate).toArray();
      return results.length > 0;
    }
    const results = await this.toArray();
    return results.length > 0;
  }

  async all(predicate: (item: T) => boolean): Promise<boolean> {
    const compiled = ExpressionParser.compile(predicate);
    const results = await this.toArray();
    return results.every(compiled);
  }

  async sum(selector: (item: T) => number): Promise<number> {
    const compiled = ExpressionParser.compile(selector);
    const results = await this.toArray();
    return results.reduce((sum, item) => sum + compiled(item), 0);
  }

  async average(selector: (item: T) => number): Promise<number> {
    const compiled = ExpressionParser.compile(selector);
    const results = await this.toArray();
    if (results.length === 0) return 0;
    return results.reduce((sum, item) => sum + compiled(item), 0) / results.length;
  }

  async min(selector: (item: T) => number): Promise<number> {
    const compiled = ExpressionParser.compile(selector);
    const results = await this.toArray();
    if (results.length === 0) throw new Error('Sequence contains no elements');
    return Math.min(...results.map(compiled));
  }

  async max(selector: (item: T) => number): Promise<number> {
    const compiled = ExpressionParser.compile(selector);
    const results = await this.toArray();
    if (results.length === 0) throw new Error('Sequence contains no elements');
    return Math.max(...results.map(compiled));
  }

  async groupBy<K>(keySelector: (item: T) => K): Promise<Map<K, T[]>> {
    const compiled = ExpressionParser.compile(keySelector);
    const results = await this.toArray();
    const groups = new Map<K, T[]>();
    
    for (const item of results) {
      const key = compiled(item);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }
    
    return groups;
  }

  async distinct(): Promise<T[]> {
    const results = await this.toArray();
    return Array.from(new Set(results.map(item => JSON.stringify(item))))
      .map(str => JSON.parse(str));
  }

  private clone(): Queryable<T> {
    const newQuery = new Queryable(this.dbContext, this.entityType, this.tableName);
    newQuery.filters = [...this.filters];
    newQuery.sortKeys = [...this.sortKeys];
    newQuery.skipCount = this.skipCount;
    newQuery.takeCount = this.takeCount;
    newQuery.includeRelations = [...this.includeRelations];
    newQuery.selectFields = this.selectFields ? [...this.selectFields] : undefined;
    newQuery.projection = this.projection;
    return newQuery;
  }

  private async loadRelations(results: T[]): Promise<T[]> {
    for (const relation of this.includeRelations) {
      const foreignKeys = Reflect.getMetadata('foreignKeys', this.entityType.prototype) || [];
      const fk = foreignKeys.find((f: any) => f.propertyKey === relation);
      
      if (fk) {
        const relatedEntity = fk.relatedEntity();
        const relatedTableName = Reflect.getMetadata('tableName', relatedEntity.prototype);
        const relatedData = await this.dbContext.getData(relatedTableName);
        
        for (const item of results) {
          const relatedId = (item as any)[relation + 'Id'];
          (item as any)[relation] = relatedData.find((r: any) => r.id === relatedId);
        }
      }
    }
    
    return results;
  }
}

// src/core/dbSet.ts
