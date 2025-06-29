# TypeScript ORM - LINQ + Persistent Storage Solution

A lightweight, TypeScript-first ORM that brings LINQ-style querying to Node.js with built-in persistent storage. This library combines the expressiveness of .NET's LINQ with high-performance file-based storage, perfect for applications that need powerful querying without the overhead of a full database server.

## ✨ Key Features

- **LINQ-like Query System**: Familiar, chainable query methods inspired by C# LINQ
- **Type-Safe**: Full TypeScript support with decorators and generics
- **Persistent Storage**: High-performance file-based storage with intelligent caching
- **Zero Dependencies**: No external database required
- **Concurrent Operations**: Built-in support for concurrent reads and writes
- **Relationship Management**: Support for one-to-one, one-to-many, and many-to-many relationships
- **Auto-incrementing IDs**: Automatic ID generation for entities
- **Query Optimization**: Smart caching and batch write operations

## 📦 Installation

```bash
npm install @your-org/typescript-orm
```

## 🚀 Quick Start

### 1. Define Your Models

Use decorators to define your entity models:

```typescript
import { Table, PrimaryKey, Column, ForeignKey } from '@your-org/typescript-orm';

@Table('users')
export class User {
  @PrimaryKey()
  @Column({ type: 'number' })
  id!: number;

  @Column({ type: 'string' })
  name!: string;

  @Column({ type: 'string', unique: true })
  email!: string;

  @Column({ type: 'number', nullable: true })
  age?: number;

  @Column({ type: 'date' })
  createdAt!: Date;

  @ForeignKey(() => Department)
  departmentId?: number;

  department?: Department;
}

@Table('products')
export class Product {
  @PrimaryKey()
  @Column({ type: 'number' })
  id!: number;

  @Column({ type: 'string' })
  name!: string;

  @Column({ type: 'number' })
  price!: number;

  @Column({ type: 'number' })
  stock!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
```

### 2. Configure Your Database

```typescript
import { DbConfig } from '@your-org/typescript-orm';

export const dbConfig: DbConfig = {
  dbName: 'myapp',
  connectionString: 'fast://./data/myapp', // Uses high-performance file storage
  
  // Preload frequently accessed tables for better performance
  preload: ['users', 'products'],
  
  entities: {
    users: {
      type: User,
      tableName: 'users'
    },
    products: {
      type: Product,
      tableName: 'products'
    }
  }
};
```

### 3. Create Your DbContext

```typescript
import { DbContext, DbSet } from '@your-org/typescript-orm';

export class AppDbContext extends DbContext {
  users!: DbSet<User>;
  products!: DbSet<Product>;

  constructor() {
    super(dbConfig);
  }

  protected onModelCreating(): void {
    // Configure your models here if needed
    console.log('Configuring models...');
  }
}
```

### 4. Start Using LINQ-like Queries

```typescript
const context = new AppDbContext();
await context.connect();

// Create entities
const user = await context.users.add({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  createdAt: new Date()
});

// Query with LINQ-style methods
const activeProducts = await context.products
  .where(p => p.isActive === true)
  .where(p => p.stock > 0)
  .orderByDescending('price')
  .skip(10)
  .take(20)
  .toArray();

// Complex queries with projections
const productNames = await context.products
  .where(p => p.price < 100)
  .select('name', 'price')
  .toArray();
```

## 📚 LINQ-Style Query Methods

### Basic Queries

```typescript
// Where clause
const users = await context.users
  .where(u => u.age! > 25)
  .toArray();

// Multiple where clauses (AND operation)
const products = await context.products
  .where(p => p.price < 100)
  .where(p => p.isActive === true)
  .toArray();

// First or null
const user = await context.users
  .where(u => u.email === 'john@example.com')
  .first();

// First with default
const defaultUser = { id: 0, name: 'Guest', email: 'guest@example.com', createdAt: new Date() };
const user = await context.users
  .where(u => u.age === 999)
  .firstOrDefault(defaultUser);

// Single (throws if not exactly one result)
const product = await context.products
  .where(p => p.name === 'Unique Product')
  .single();
```

### Advanced Query Expressions

The ORM includes a powerful `Where` expression builder for complex queries:

```typescript
import { Where } from '@your-org/typescript-orm';

// Comparison operators
const expensive = await context.products
  .where(Where.gt('price', 100))
  .toArray();

const inStock = await context.products
  .where(Where.gte('stock', 10))
  .toArray();

// String operations
const gmailUsers = await context.users
  .where(Where.contains('email', 'gmail.com'))
  .toArray();

const johnUsers = await context.users
  .where(Where.startsWith('name', 'John'))
  .toArray();

// Logical operations
const complexQuery = await context.products
  .where(Where.and(
    Where.gt('price', 50),
    Where.eq('isActive', true),
    Where.lt('stock', 100)
  ))
  .toArray();

const eitherOr = await context.products
  .where(Where.or(
    Where.lt('price', 20),
    Where.eq('stock', 0)
  ))
  .toArray();

// IN operator
const specificProducts = await context.products
  .where(Where.in('id', [1, 5, 9, 12]))
  .toArray();
```

### Sorting and Pagination

```typescript
// Order by ascending
const sortedAsc = await context.products
  .orderBy('price')
  .toArray();

// Order by descending
const sortedDesc = await context.products
  .orderByDescending('createdAt')
  .toArray();

// Pagination
const page2 = await context.products
  .orderBy('name')
  .skip(20)
  .take(20)
  .toArray();

// Complex sorting with filtering
const results = await context.users
  .where(u => u.age! > 18)
  .orderByDescending('age')
  .skip(10)
  .take(5)
  .toArray();
```

### Projections

```typescript
// Select specific fields
const userEmails = await context.users
  .select('email')
  .toArray();

// Select multiple fields
const productInfo = await context.products
  .where(p => p.isActive === true)
  .select('name', 'price', 'stock')
  .toArray();
```

### Aggregations

```typescript
// Count
const totalUsers = await context.users.count();
const adults = await context.users
  .where(u => u.age! >= 18)
  .count();

// Any
const hasExpensive = await context.products
  .any(p => p.price > 1000);

// All
const allInStock = await context.products
  .all(p => p.stock > 0);
```

## 🔗 Relationship Management

### One-to-Many Relationships

```typescript
// User has many Orders
const user = await context.users.find(1);
const userOrders = await context.orders
  .where(o => o.userId === user!.id)
  .toArray();
```

### One-to-One Relationships

```typescript
// User has one Profile
const profile = await context.profiles
  .where(p => p.userId === userId)
  .first();
```

### Many-to-Many Relationships

```typescript
// Products have many Tags through ProductTags
const productTags = await context.productTags
  .where(pt => pt.productId === productId)
  .toArray();

// Get all products with a specific tag
const gamingProducts = await context.productTags
  .where(pt => pt.tagId === gamingTagId)
  .toArray();
```

### Self-Referencing Relationships

```typescript
// Category hierarchy
const childCategories = await context.categories
  .where(c => c.parentCategoryId === parentId)
  .toArray();
```

## 🚄 Performance Features

### Intelligent Caching

The ORM automatically caches frequently accessed data:

```typescript
// First read hits the disk
const products1 = await context.products.toArray();

// Subsequent reads use cache (much faster)
const products2 = await context.products.toArray();
```

### Batch Operations

Optimize bulk inserts with `addRange`:

```typescript
// Efficient bulk insert
const products = await context.products.addRange([
  { name: 'Product 1', price: 10.99, stock: 100, isActive: true },
  { name: 'Product 2', price: 20.99, stock: 50, isActive: true },
  { name: 'Product 3', price: 30.99, stock: 25, isActive: false }
]);
```

### Write Batching

Writes are automatically batched for better performance:

```typescript
// Multiple writes are batched together
const promises = [];
for (let i = 0; i < 100; i++) {
  promises.push(context.products.add({
    name: `Product ${i}`,
    price: Math.random() * 100,
    stock: 50,
    isActive: true
  }));
}
await Promise.all(promises); // Writes are batched
```

## 🔄 Concurrent Operations

The ORM handles concurrent operations safely:

```typescript
// Safe concurrent reads
const readPromises = Array.from({ length: 20 }, () => 
  context.products
    .where(p => p.price > 50)
    .toArray()
);
const results = await Promise.all(readPromises);

// Safe concurrent writes with unique ID generation
const writePromises = Array.from({ length: 10 }, (_, i) => 
  context.orders.add({
    orderNumber: `ORD-${i}`,
    totalAmount: i * 100,
    orderDate: new Date(),
    status: 'pending',
    userId: 1
  })
);
const orders = await Promise.all(writePromises);
```

## 📁 Storage Configuration

### Connection Strings

- `memory://` - In-memory storage (testing)
- `fast://./path` - High-performance file storage (recommended)
- `sqlite://` - SQLite storage (coming soon)

### Default Configuration

```typescript
const config: DbConfig = {
  dbName: 'myapp',
  connectionString: 'fast://./data/myapp',
  preload: [], // Tables to preload on startup
  entities: {} // Entity configuration
};
```

## 🧪 Testing

The ORM includes comprehensive test coverage for:

- ✅ Entity CRUD operations
- ✅ Complex LINQ-style queries
- ✅ Relationship management
- ✅ Concurrent operations
- ✅ Performance optimizations
- ✅ Error handling and validation
- ✅ Storage persistence

## 📊 Performance Benchmarks

Based on our test suite:

- **Bulk Insert**: 1,000 items in < 5 seconds
- **Complex Queries**: < 100ms on datasets with 500+ items
- **Cache Hit Rate**: 50%+ faster than disk reads
- **Concurrent Operations**: 100 operations completed successfully

## 🛡️ Error Handling

The ORM provides clear error messages:

```typescript
try {
  // Throws if no results
  const user = await context.users
    .where(u => u.email === 'nonexistent@test.com')
    .single();
} catch (error) {
  console.error('User not found');
}

// Safe alternatives
const user = await context.users
  .where(u => u.email === 'maybe@test.com')
  .first(); // Returns null if not found
```

## 🎯 Use Cases

This ORM is perfect for:

- **Desktop Applications**: Electron apps that need local data persistence
- **CLI Tools**: Command-line tools that manage structured data
- **Prototypes**: Quick prototypes that need a database without setup
- **Small Services**: Microservices that don't need a full database server
- **Testing**: Integration tests that need a real persistence layer

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.