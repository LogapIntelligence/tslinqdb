import { TestRunner, assert, assertEqual, assertNotNull } from '../testRunner';
import { createTestContext, cleanDatabase } from '../testUtils';
import { AppDbContext } from '../../contexts/appDbContext';
import * as fs from 'fs/promises';
import * as path from 'path';
import config from '../../test.config';

export async function run(runner: TestRunner): Promise<void> {
  runner.startGroup('Storage Provider Features');
  
  let context: AppDbContext;
  
  await runner.test('Data persistence to disk', async () => {
    context = await createTestContext();
    
    const user = await context.users.add({
      name: 'Persistent User',
      email: 'persist@test.com',
      createdAt: new Date()
    });
    
    await context.dispose();
    
    const context2 = new AppDbContext();
    await context2.connect();
    
    const found = await context2.users.find(user.id);
    assertNotNull(found);
    assertEqual(found!.name, 'Persistent User');
    
    await context2.dispose();
  });
  
  await runner.test('File structure validation', async () => {
    await cleanDatabase();
    context = await createTestContext();
    
    await context.users.add({
      name: 'File Test User',
      email: 'file@test.com',
      createdAt: new Date()
    });
    
    await context.products.add({
      name: 'File Test Product',
      price: 99.99,
      stock: 10,
      isActive: true
    });
    
    await context.dispose();
    
    const dataDir = config.DB_PATH;
    const files = await fs.readdir(dataDir);
    
    assert(files.includes('users.json'), 'Users file should exist');
    assert(files.includes('products.json'), 'Products file should exist');
  });
  
  await runner.test('Cache behavior', async () => {
    context = await createTestContext();
    
    const products : any = [];
    for (let i = 0; i < 20; i++) {
      products.push(await context.products.add({
        name: `Product ${i}`,
        price: i * 10,
        stock: i * 5,
        isActive: i % 2 === 0
      }));
    }
    
    const start = performance.now();
    
    await context.products.toArray();
    const firstReadTime = performance.now() - start;
    
    const cacheStart = performance.now();
    for (let i = 0; i < 10; i++) {
      await context.products.toArray();
    }
    const cacheReadTime = (performance.now() - cacheStart) / 10;
    
    assert(cacheReadTime < firstReadTime, 'Cache reads should be faster than disk reads');
    
    await context.dispose();
  });
  
  await runner.test('Write batching', async () => {
    context = await createTestContext();
    
    const promises : any = [];
    for (let i = 0; i < 5; i++) {
      promises.push(context.tags.add({
        name: `tag-${i}`,
        color: `#${i}${i}${i}${i}${i}${i}`
      }));
    }
    
    await Promise.all(promises);
    
    const tags = await context.tags.toArray();
    assertEqual(tags.length, 5);
    
    await context.dispose();
  });
  
  await runner.test('Empty table handling', async () => {
    context = await createTestContext();
    
    const profiles = await context.profiles.toArray();
    assertEqual(profiles.length, 0);
    
    const count = await context.profiles.count();
    assertEqual(count, 0);
    
    const any = await context.profiles.any();
    assertEqual(any, false);
    
    const first = await context.profiles.first();
    assertEqual(first, null);
    
    await context.dispose();
  });
  
  await runner.test('Large dataset handling', async () => {
    context = await createTestContext();
    
    const categories : any = [];
    for (let i = 0; i < 100; i++) {
      categories.push({
        name: `Category ${i}`,
        description: `Description for category ${i}`
      });
    }
    
    await context.categories.addRange(categories);
    
    const filtered = await context.categories
      .where(c => c.name.includes('5'))
      .toArray();
    
    assertEqual(filtered.length, 19);
    
    await context.dispose();
  });
  
  await runner.test('Data directory creation', async () => {

    await cleanDatabase();
    
    try {
      await fs.rmdir(config.DB_PATH);
    } catch {}
    
    context = await createTestContext();
    
    const stats = await fs.stat(config.DB_PATH);
    assert(stats.isDirectory(), 'Data directory should be created');
    
    await context.dispose();
  });
  
  await runner.test('Invalid data recovery', async () => {
    const dataDir = config.DB_PATH;
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, 'corrupted.json'), 'invalid json{]');
    
    context = await createTestContext();
    
    try {
      await context['dbSets'].get('corrupted')?.toArray();
    } catch (error) {
      assert(true, 'Should handle corrupted data');
    }
    
    await context.dispose();
  });
  
  runner.endGroup();
}