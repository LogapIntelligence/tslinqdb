import { Queryable } from "../query/queryable";
import { CreateEntity } from "../types/entity.types";

export class DbSet<T> {
  private writeLock: Promise<void> = Promise.resolve();
  
  constructor(
    private dbContext: any,
    private entityType: new () => T,
    private tableName: string
  ) {}

  query(): Queryable<T> {
    return new Queryable(this.dbContext, this.entityType, this.tableName);
  }

  where(predicate: (item: T) => boolean): Queryable<T> {
    return this.query().where(predicate);
  }

  select<K extends keyof T>(...fields: K[]): Queryable<Pick<T, K>> {
    return this.query().select(...fields);
  }

  orderBy<K extends keyof T>(key: K): Queryable<T> {
    return this.query().orderBy(key);
  }

  orderByDescending<K extends keyof T>(key: K): Queryable<T> {
    return this.query().orderByDescending(key);
  }

  skip(count: number): Queryable<T> {
    return this.query().skip(count);
  }

  take(count: number): Queryable<T> {
    return this.query().take(count);
  }

  include(relation: keyof T): Queryable<T> {
    return this.query().include(relation);
  }

  async toArray(): Promise<T[]> {
    return this.query().toArray();
  }

  async first(): Promise<T | null> {
    return this.query().first();
  }

  async firstOrDefault(defaultValue: T): Promise<T> {
    return this.query().firstOrDefault(defaultValue);
  }

  async single(): Promise<T> {
    return this.query().single();
  }

  async count(): Promise<number> {
    return this.query().count();
  }

  async any(predicate?: (item: T) => boolean): Promise<boolean> {
    return this.query().any(predicate);
  }

  async all(predicate: (item: T) => boolean): Promise<boolean> {
    return this.query().all(predicate);
  }

  private async withWriteLock<R>(operation: () => Promise<R>): Promise<R> {
    const currentLock = this.writeLock;
    let resolver: () => void;
    this.writeLock = new Promise<void>(resolve => { resolver = resolve; });
    
    try {
      await currentLock; 
      return await operation();
    } finally {
      resolver!();
    }
  }

  async add(entity: CreateEntity<T>): Promise<T> {
    return this.withWriteLock(async () => {
      const data = await this.dbContext.getData(this.tableName);
      const primaryKey = Reflect.getMetadata('primaryKey', this.entityType.prototype) || 'id';
      
      const newEntity = { ...entity } as any;
      
      if (!newEntity[primaryKey]) {
        const maxId = Math.max(0, ...data.map((item: any) => item[primaryKey] || 0));
        newEntity[primaryKey] = maxId + 1;
      }
      
      data.push(newEntity);
      await this.dbContext.saveData(this.tableName, data);
      return newEntity as T;
    });
  }

  async addRange(entities: CreateEntity<T>[]): Promise<T[]> {
    return this.withWriteLock(async () => {
      const data = await this.dbContext.getData(this.tableName);
      const primaryKey = Reflect.getMetadata('primaryKey', this.entityType.prototype) || 'id';
      const results: T[] = [];
      
      let nextId = Math.max(0, ...data.map((item: any) => item[primaryKey] || 0)) + 1;
      
      for (const entity of entities) {
        const newEntity = { ...entity } as any;
        
        if (!newEntity[primaryKey]) {
          newEntity[primaryKey] = nextId++;
        }
        
        data.push(newEntity);
        results.push(newEntity as T);
      }
      
      await this.dbContext.saveData(this.tableName, data);
      return results;
    });
  }

  async update(entity: T): Promise<T> {
    return this.withWriteLock(async () => {
      const data = await this.dbContext.getData(this.tableName);
      const primaryKey = Reflect.getMetadata('primaryKey', this.entityType.prototype) || 'id';
      const id = (entity as any)[primaryKey];
      
      const index = data.findIndex((item: any) => item[primaryKey] === id);
      if (index === -1) {
        throw new Error('Entity not found');
      }
      
      data[index] = entity;
      await this.dbContext.saveData(this.tableName, data);
      return entity;
    });
  }

  async remove(entity: T): Promise<void> {
    return this.withWriteLock(async () => {
      const data = await this.dbContext.getData(this.tableName);
      const primaryKey = Reflect.getMetadata('primaryKey', this.entityType.prototype) || 'id';
      const id = (entity as any)[primaryKey];
      
      const filteredData = data.filter((item: any) => item[primaryKey] !== id);
      await this.dbContext.saveData(this.tableName, filteredData);
    });
  }

  async find(id: any): Promise<T | null> {
    const data = await this.dbContext.getData(this.tableName);
    const primaryKey = Reflect.getMetadata('primaryKey', this.entityType.prototype) || 'id';
    
    return data.find((item: any) => item[primaryKey] === id) || null;
  }
}