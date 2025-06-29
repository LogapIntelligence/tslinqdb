// Re-export reflect-metadata to ensure it's imported
import 'reflect-metadata';

// Core exports
export { DbContext } from './core/dbContext';
export { DbSet } from './core/dbSet';
export { DbConfig } from './config/dbConfig';

// Decorators
export { 
  Column, 
  PrimaryKey, 
  ForeignKey, 
  Table,
  type ColumnOptions 
} from './decorators/column';

// Query system
export { Queryable } from './query/queryable';
export { Where } from './query/expressions';

// Types
export { 
  CreateEntity, 
  UpdateEntity, 
  BaseEntity, 
  PrimaryKey as PrimaryKeyType 
} from './types/entity.types';

// Storage providers (if you want to expose them)
export { StorageProvider } from './core/dbContext';
export { FastStorageProvider } from './storage/fastStorageProvider';