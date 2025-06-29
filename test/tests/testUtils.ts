import { AppDbContext } from '../contexts/appDbContext';
import * as fs from 'fs/promises';
import * as path from 'path';
import config from '../test.config';

export async function cleanDatabase(): Promise<void> {
  const dataDir = config.DB_PATH;
  try {
    const files = await fs.readdir(dataDir);
    await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(f => fs.unlink(path.join(dataDir, f)))
    );
  } catch {
  }
}

export async function createTestContext(): Promise<AppDbContext> {
  await cleanDatabase();
  const context = new AppDbContext();
  await context.connect();
  return context;
}

export async function seedTestData(context: AppDbContext): Promise<void> {
  const engineering = await context.departments.add({
    name: 'Engineering',
    description: 'Software Development'
  });
  
  const sales = await context.departments.add({
    name: 'Sales',
    description: 'Sales Team'
  });
  
  await context.users.addRange([
    {
      name: 'Alice Johnson',
      email: 'alice@test.com',
      age: 30,
      createdAt: new Date(),
      departmentId: engineering.id
    },
    {
      name: 'Bob Smith',
      email: 'bob@test.com',
      age: 25,
      createdAt: new Date(),
      departmentId: sales.id
    },
    {
      name: 'Charlie Brown',
      email: 'charlie@test.com',
      createdAt: new Date()
    }
  ]);
  
  await context.products.addRange([
    { name: 'Laptop', price: 999.99, stock: 50, isActive: true },
    { name: 'Mouse', price: 29.99, stock: 100, isActive: true },
    { name: 'Keyboard', price: 79.99, stock: 75, isActive: true },
    { name: 'Monitor', price: 299.99, stock: 0, isActive: false }
  ]);
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}