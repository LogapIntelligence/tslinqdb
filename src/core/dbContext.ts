import { DbConfig } from "../config/dbConfig";
import { FastStorageProvider } from "../storage/fastStorageProvider";
import { DbSet } from "./dbSet";

export interface StorageProvider {
  connect(config: any): Promise<void>;
  getData(table: string): Promise<any[]>;
  saveData(table: string, data: any[]): Promise<void>;
  query(table: string, filter: (item: any) => boolean): Promise<any[]>;
  close(): Promise<void>;
}

export abstract class DbContext {
  private dbSets: Map<string, DbSet<any>> = new Map();
  private storageProvider: StorageProvider;
  private isConnected: boolean = false;

  constructor(private config: DbConfig) {
    this.storageProvider = this.createStorageProvider();
  }

  protected abstract onModelCreating(): void;

  private createStorageProvider(): StorageProvider {
    const connectionString = this.config.connectionString || 'memory://';
    
    if (connectionString.startsWith('memory://')) {
      return new InMemoryStorageProvider();
    } else if (connectionString.startsWith('fast://')) {
      return new FastStorageProvider();
    } else if (connectionString.startsWith('sqlite://')) {
      throw new Error('SQLite provider not implemented yet');
    } else {
      throw new Error(`Unknown storage provider: ${connectionString}`);
    }
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    
    const config = this.parseConnectionString(this.config.connectionString || '');
    await this.storageProvider.connect(config);
    
    this.initializeDbSets();
    this.isConnected = true;
  }

  private parseConnectionString(connectionString: string): any {
    const url = new URL(connectionString.replace('fast://', 'http://'));
    return {
      dataDir: url.pathname || './data',
      preload: this.config.preload || []
    };
  }

  private initializeDbSets() {
    this.onModelCreating();
    
    for (const [propertyName, entityConfig] of Object.entries(this.config.entities)) {
      const tableName = entityConfig.tableName || propertyName;
      
      const dbSet = new DbSet(this, entityConfig.type, tableName);
      this.dbSets.set(propertyName, dbSet);
      
      Object.defineProperty(this, propertyName, {
        get: () => this.dbSets.get(propertyName)
      });
    }
  }

  async getData(tableName: string): Promise<any[]> {
    if (!this.isConnected) await this.connect();
    return this.storageProvider.getData(tableName);
  }

  async saveData(tableName: string, data: any[]): Promise<void> {
    if (!this.isConnected) await this.connect();
    return this.storageProvider.saveData(tableName, data);
  }

  async queryData(tableName: string, filter: (item: any) => boolean): Promise<any[]> {
    if (!this.isConnected) await this.connect();
    return this.storageProvider.query(tableName, filter);
  }

  async saveChanges(): Promise<void> {
    console.log('Changes committed');
  }

  async dispose(): Promise<void> {
    if (this.isConnected) {
      await this.storageProvider.close();
      this.isConnected = false;
    }
  }
}

class InMemoryStorageProvider implements StorageProvider {
  private storage: Map<string, any[]> = new Map();

  async connect(config: any): Promise<void> {
  }

  async getData(table: string): Promise<any[]> {
    return [...(this.storage.get(table) || [])];
  }

  async saveData(table: string, data: any[]): Promise<void> {
    this.storage.set(table, [...data]);
  }

  async query(table: string, filter: (item: any) => boolean): Promise<any[]> {
    const data = await this.getData(table);
    return data.filter(filter);
  }

  async close(): Promise<void> {
    this.storage.clear();
  }
}