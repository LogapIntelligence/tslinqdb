import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { EventEmitter } from 'events';

interface StorageProvider {
  connect(config: any): Promise<void>;
  getData(table: string): Promise<any[]>;
  saveData(table: string, data: any[]): Promise<void>;
  query(table: string, filter: (item: any) => boolean): Promise<any[]>;
  close(): Promise<void>;
}

interface CacheEntry<T> {
  data: ReadonlyArray<T>;
  version: number;
  lastAccess: number;
}

export class FastStorageProvider implements StorageProvider {
  private dataDir: string = './data';
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingReads: Map<string, Promise<any[]>> = new Map();
  private writeQueue: Map<string, any[]> = new Map();
  private writeTimer: NodeJS.Timeout | null = null;
  private version: number = 0;
  private eventBus = new EventEmitter();

  private readonly config = {
    maxCacheSize: 100 * 1024 * 1024, 
    writeDelay: 100, 
    hotDataThreshold: 10, 
  };

  private readCounts: Map<string, number> = new Map();

  async connect(config: any): Promise<void> {
    if (config.dataDir) {
      this.dataDir = config.dataDir;
    }
    
    await fs.mkdir(this.dataDir, { recursive: true });
    
    if (config.preload) {
      await Promise.all(config.preload.map((table: string) => this.warmCache(table)));
    }
  }

  async getData(table: string): Promise<any[]> {
    const cached = this.cache.get(table);
    if (cached) {
      cached.lastAccess = Date.now();
      return [...cached.data];
    }

    const pending = this.pendingReads.get(table);
    if (pending) {
      return pending;
    }

    const loadPromise = this.loadFromDisk(table);
    this.pendingReads.set(table, loadPromise);

    try {
      const data = await loadPromise;
      
      const reads = (this.readCounts.get(table) || 0) + 1;
      this.readCounts.set(table, reads);
      
      if (reads >= this.config.hotDataThreshold) {
        this.addToCache(table, data);
      }
      
      return data;
    } finally {
      this.pendingReads.delete(table);
    }
  }

  async query(table: string, filter: (item: any) => boolean): Promise<any[]> {
    const data = await this.getData(table);

    return data.filter(filter);
  }

  async saveData(table: string, data: any[]): Promise<void> {

    this.version++;
    
    this.addToCache(table, data);
    
    this.writeQueue.set(table, data);
    
    if (!this.writeTimer) {
      this.writeTimer = setTimeout(() => this.flushWrites(), this.config.writeDelay);
    }
  }

  private async loadFromDisk(table: string): Promise<any[]> {
    const filePath = path.join(this.dataDir, `${table}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  private addToCache(table: string, data: any[]): void {
    const immutableData = Object.freeze([...data]);
    
    this.cache.set(table, {
      data: immutableData,
      version: this.version,
      lastAccess: Date.now()
    });
    
    this.evictIfNeeded();
  }

  private evictIfNeeded(): void {
    if (this.cache.size > 50) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].lastAccess - b[1].lastAccess);
      
      const toRemove = entries.slice(0, entries.length - 40);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  private async flushWrites(): Promise<void> {
    this.writeTimer = null;
    
    const writes = Array.from(this.writeQueue.entries());
    this.writeQueue.clear();
    
    await Promise.all(
      writes.map(([table, data]) => this.writeToDisk(table, data))
    );
    
    writes.forEach(([table]) => {
      this.eventBus.emit('write-complete', table);
    });
  }

  private async writeToDisk(table: string, data: any[]): Promise<void> {
    const filePath = path.join(this.dataDir, `${table}.json`);
    const tempPath = `${filePath}.tmp`;
    
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
    
    await fs.rename(tempPath, filePath);
  }

  private async warmCache(table: string): Promise<void> {
    try {
      const data = await this.loadFromDisk(table);
      this.addToCache(table, data);
    } catch (error) {
    }
  }

  async close(): Promise<void> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      await this.flushWrites();
    }
    
    this.cache.clear();
    this.pendingReads.clear();
  }

  async createIndex(table: string, field: string): Promise<void> {
    const data = await this.getData(table);
    const sorted = [...data].sort((a, b) => {
      if (a[field] < b[field]) return -1;
      if (a[field] > b[field]) return 1;
      return 0;
    });
    
    const indexPath = path.join(this.dataDir, `${table}.${field}.idx`);
    await fs.writeFile(indexPath, JSON.stringify(sorted));
  }

  async queryRange(table: string, field: string, min: any, max: any): Promise<any[]> {
    const indexPath = path.join(this.dataDir, `${table}.${field}.idx`);
    
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      const sorted = JSON.parse(content);
      
      const start = this.binarySearch(sorted, field, min, true);
      const end = this.binarySearch(sorted, field, max, false);
      
      return sorted.slice(start, end + 1);
    } catch {
      const data = await this.getData(table);
      return data.filter(item => item[field] >= min && item[field] <= max);
    }
  }

  private binarySearch(arr: any[], field: string, value: any, findFirst: boolean): number {
    let left = 0;
    let right = arr.length - 1;
    let result = findFirst ? arr.length : -1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midValue = arr[mid][field];
      
      if (findFirst) {
        if (midValue >= value) {
          result = mid;
          right = mid - 1;
        } else {
          left = mid + 1;
        }
      } else {
        if (midValue <= value) {
          result = mid;
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
    }
    
    return result;
  }
}