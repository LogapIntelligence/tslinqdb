# TypeScript ORM

A lightweight, Entity Framework-inspired ORM for TypeScript with LINQ-style querying, decorators, and multiple storage providers that comes standard with out of box persistant storage using //FAST

## Features

- 🎯 **LINQ-style querying** - Familiar syntax for .NET developers
- 🏷️ **Decorator-based entity mapping** - Clean entity definitions with TypeScript decorators
- 💾 **Multiple storage providers** - In-memory, file-based, and extensible for other backends
- 🚀 **Performance optimized** - Built-in caching, lazy loading, and query optimization
- 🔒 **Type-safe** - Full TypeScript support with intellisense
- ⚡ **Auto-increment IDs** - Automatic primary key generation

## Installation

```bash
npm install tslinqdb
```

## Quick Start

### 1. Define Your Entities

```typescript
import { Table, PrimaryKey, Column, ForeignKey } from 'tslinqdb';

@Table('users')
export class User {
  @PrimaryKey()
  @Column({ type: 'number' })
  id!: number;

  @Column({ type: 'string' })
  name!: string;

  @Column({ type: 'string' })
  email!: string;

  @Column({ type: 'number' })
  age!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'date' })
  createdAt!: Date;
}

@Table('posts')
export class Post {
  @PrimaryKey()
  @Column({ type: 'number' })
  id!: number;

  @Column({ type: 'string' })
  title!: string;

  @Column({ type: 'string' })
  content!: string;

  @Column({ type: 'number' })
  @ForeignKey(() => User)
  userId!: number;

  user?: User;

  @Column({ type: 'date' })
  publishedAt!: Date;
}
```

### 2. Create Your DbContext

```typescript
import { DbContext, DbSet, DbConfig } from 'typescript-orm';
import { User, Post } from './entities';

export class AppDbContext extends DbContext {
  users!: DbSet<User>;
  posts!: DbSet<Post>;

  constructor() {
    const config: DbConfig = {
      connectionString: 'fast://./data',  // or 'memory://' for in-memory
      dbName: 'myapp',
      preload: ['users', 'posts'],  // Tables to preload into cache
      entities: {
        users: { type: User, tableName: 'users' },
        posts: { type: Post, tableName: 'posts' }
      }
    };
    super(config);
  }

  protected onModelCreating(): void {
    // Additional configuration can go here
  }
}
```

### 3. Basic Usage

```typescript
const db = new AppDbContext();
await db.connect();

// Add a new user
const newUser = await db.users.add({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  isActive: true,
  createdAt: new Date()
});

// Add multiple users
const users = await db.users.addRange([
  { name: 'Jane Smith', email: 'jane@example.com', age: 25, isActive: true, createdAt: new Date() },
  { name: 'Bob Johnson', email: 'bob@example.com', age: 35, isActive: false, createdAt: new Date() }
]);

// Find by ID
const user = await db.users.find(1);

// Update
if (user) {
  user.age = 31;
  await db.users.update(user);
}

// Remove
await db.users.remove(user);
```

## Query Operations

### Filtering with `where`

```typescript
// Simple condition
const activeUsers = await db.users
  .where(u => u.isActive)
  .toArray();

// Multiple conditions
const youngActiveUsers = await db.users
  .where(u => u.isActive && u.age < 30)
  .toArray();

// Complex conditions
const filteredUsers = await db.users
  .where(u => u.name.includes('John') || u.email.endsWith('@example.com'))
  .toArray();
```

### Projection with `select`

```typescript
// Select specific fields
const userNames = await db.users
  .select(u => ({ name: u.name, email: u.email }))
  .toArray();

// Transform data
const userSummaries = await db.users
  .select(u => ({
    fullInfo: `${u.name} (${u.email})`,
    ageGroup: u.age < 30 ? 'Young' : 'Adult'
  }))
  .toArray();
```

### Sorting with `orderBy` and `orderByDescending`

```typescript
// Ascending order
const usersByName = await db.users
  .orderBy(u => u.name)
  .toArray();

// Descending order
const usersByAgeDesc = await db.users
  .orderByDescending(u => u.age)
  .toArray();

// Multiple sort criteria
const sortedUsers = await db.users
  .orderBy(u => u.isActive)
  .thenBy(u => u.name)  // Note: use multiple orderBy calls
  .toArray();
```

### Pagination with `skip` and `take`

```typescript
// Get page 2 with 10 items per page
const pageSize = 10;
const pageNumber = 2;
const pagedUsers = await db.users
  .orderBy(u => u.id)
  .skip((pageNumber - 1) * pageSize)
  .take(pageSize)
  .toArray();
```

### Aggregation Functions

```typescript
// Count
const totalUsers = await db.users.count();
const activeUserCount = await db.users.where(u => u.isActive).count();

// Any - check if any items match
const hasActiveUsers = await db.users.any(u => u.isActive);
const hasAnyUsers = await db.users.any(); // without predicate

// All - check if all items match
const allUsersActive = await db.users.all(u => u.isActive);

// Sum
const totalAge = await db.users.sum(u => u.age);

// Average
const averageAge = await db.users.average(u => u.age);

// Min/Max
const youngestAge = await db.users.min(u => u.age);
const oldestAge = await db.users.max(u => u.age);
```

### Grouping with `groupBy`

```typescript
// Group by a single property
const usersByActiveStatus = await db.users.groupBy(u => u.isActive);
// Returns: Map<boolean, User[]>

// Group by age range
const usersByAgeGroup = await db.users.groupBy(u => 
  u.age < 20 ? 'Teen' : 
  u.age < 30 ? 'Twenties' : 
  u.age < 40 ? 'Thirties' : 'Older'
);
// Returns: Map<string, User[]>

// Process grouped data
usersByAgeGroup.forEach((users, ageGroup) => {
  console.log(`${ageGroup}: ${users.length} users`);
});
```

### Other Query Operations

```typescript
// First - get first item or null
const firstUser = await db.users.first();
const firstActiveUser = await db.users.where(u => u.isActive).first();

// FirstOrDefault - get first item or default value
const defaultUser = { id: 0, name: 'Default', email: '', age: 0, isActive: false, createdAt: new Date() };
const user = await db.users.firstOrDefault(defaultUser);

// Single - get exactly one item (throws if not exactly one)
const singleUser = await db.users.where(u => u.id === 1).single();

// Distinct - get unique items
const distinctUsers = await db.users.distinct();

// Include - eager load related data
const postsWithUsers = await db.posts
  .include(p => p.user)
  .toArray();
```

## Complex Query Examples

### Combining Multiple Operations

```typescript
// Get top 5 active users over 25, ordered by name
const topUsers = await db.users
  .where(u => u.isActive && u.age > 25)
  .orderBy(u => u.name)
  .take(5)
  .select(u => ({
    id: u.id,
    name: u.name,
    email: u.email
  }))
  .toArray();

// Get user statistics by age group
const ageGroups = await db.users.groupBy(u => Math.floor(u.age / 10) * 10);
const stats = [];
for (const [ageGroup, users] of ageGroups) {
  stats.push({
    ageGroup: `${ageGroup}-${ageGroup + 9}`,
    count: users.length,
    averageAge: users.reduce((sum, u) => sum + u.age, 0) / users.length
  });
}

// Find users with posts
const usersWithPosts = await db.users
  .where(user => db.posts.any(post => post.userId === user.id))
  .toArray();
```

## Storage Providers

### In-Memory Storage
Perfect for testing and development:
```typescript
connectionString: 'memory://'
```

### Fast File Storage
High-performance file-based storage with caching:
```typescript
connectionString: 'fast://./data'
```

Features:
- Automatic caching of frequently accessed data
- Write batching for improved performance
- Hot data detection and optimization
- Atomic writes to prevent data corruption

## Advanced Features

### Custom Column Options

```typescript
@Column({ 
  type: 'string',
  nullable: true,
  unique: true,
  default: 'N/A'
})
description?: string;
```

### Transaction Support

```typescript
// All operations are batched until saveChanges is called
await db.users.add({ name: 'User 1', ... });
await db.users.add({ name: 'User 2', ... });
await db.saveChanges(); // Commits all pending changes
```

### Disposal

```typescript
// Always dispose of the context when done
await db.dispose();
```

## Performance Tips

1. **Use preload** for frequently accessed tables
2. **Index frequently queried fields** for better performance
3. **Batch operations** when possible using `addRange`
4. **Use projections** to reduce memory usage when you don't need all fields
5. **Dispose contexts** properly to free resources

## TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "esModuleInterop": true
  }
}
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.