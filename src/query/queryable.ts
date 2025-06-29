export class Queryable<T> {
  private filters: ((item: T) => boolean)[] = [];
  private sortKeys: { key: keyof T; desc: boolean }[] = [];
  private skipCount = 0;
  private takeCount?: number;
  private includeRelations: string[] = [];
  private selectFields?: (keyof T)[];

  constructor(
    private dbContext: any,
    private entityType: new () => T,
    private tableName: string
  ) {}

  where(predicate: (item: T) => boolean): Queryable<T> {
    const newQuery = this.clone();
    newQuery.filters.push(predicate);
    return newQuery;
  }

  select<K extends keyof T>(...fields: K[]): Queryable<Pick<T, K>> {
    const newQuery = this.clone() as any;
    newQuery.selectFields = fields;
    return newQuery;
  }

  orderBy<K extends keyof T>(key: K): Queryable<T> {
    const newQuery = this.clone();
    newQuery.sortKeys.push({ key, desc: false });
    return newQuery;
  }

  orderByDescending<K extends keyof T>(key: K): Queryable<T> {
    const newQuery = this.clone();
    newQuery.sortKeys.push({ key, desc: true });
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

  include(relation: keyof T): Queryable<T> {
    const newQuery = this.clone();
    newQuery.includeRelations.push(relation as string);
    return newQuery;
  }

  async toArray(): Promise<T[]> {
    let results = await this.dbContext.getData(this.tableName);
    
    for (const filter of this.filters) {
      results = results.filter(filter);
    }
    
    for (const sort of this.sortKeys) {
      results.sort((a: any, b: any) => {
        const aVal = a[sort.key];
        const bVal = b[sort.key];
        const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sort.desc ? -result : result;
      });
    }
    
    if (this.skipCount > 0) {
      results = results.slice(this.skipCount);
    }
    if (this.takeCount !== undefined) {
      results = results.slice(0, this.takeCount);
    }
    
    if (this.includeRelations.length > 0) {
      results = await this.loadRelations(results);
    }
    
    if (this.selectFields) {
      results = results.map((item : any)=> {
        const projected: any = {};
        for (const field of this.selectFields!) {
          projected[field] = item[field as string];
        }
        return projected;
      });
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
    const results = await this.toArray();
    return results.every(predicate);
  }

  private clone(): Queryable<T> {
    const newQuery = new Queryable(this.dbContext, this.entityType, this.tableName);
    newQuery.filters = [...this.filters];
    newQuery.sortKeys = [...this.sortKeys];
    newQuery.skipCount = this.skipCount;
    newQuery.takeCount = this.takeCount;
    newQuery.includeRelations = [...this.includeRelations];
    newQuery.selectFields = this.selectFields ? [...this.selectFields] : undefined;
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