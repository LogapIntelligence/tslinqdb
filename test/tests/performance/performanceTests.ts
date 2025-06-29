import { TestRunner, assert, assertEqual } from '../testRunner';
import { createTestContext } from '../testUtils';
import { AppDbContext } from '../../contexts/appDbContext';

export async function run(runner: TestRunner): Promise<void> {
  runner.startGroup('Performance & Scalability');
  
  let context: AppDbContext;
  
  await runner.test('Bulk insert performance', async () => {
    context = await createTestContext();
    
    const itemCount = 1000;
    const items : any = [];
    
    for (let i = 0; i < itemCount; i++) {
      items.push({
        name: `Bulk Product ${i}`,
        price: Math.random() * 1000,
        stock: Math.floor(Math.random() * 100),
        isActive: Math.random() > 0.5
      });
    }
    
    const start = performance.now();
    await context.products.addRange(items);
    const duration = performance.now() - start;

    assert(duration < 5000, `Bulk insert of ${itemCount} items should complete within 5 seconds`);
    
    const count = await context.products.count();
    assertEqual(count, itemCount);
    
    await context.dispose();
  });
  
  await runner.test('Query performance on large dataset', async () => {
    context = await createTestContext();
    
    const items : any = [];
    for (let i = 0; i < 500; i++) {
      items.push({
        name: `Perf User ${i}`,
        email: `perf${i}@test.com`,
        age: Math.floor(Math.random() * 50) + 20,
        createdAt: new Date()
      });
    }
    await context.users.addRange(items);
    
    const start = performance.now();
    const results = await context.users
      .where(u => u.age! > 30)
      .where(u => u.email.includes('1'))
      .orderByDescending(u => u.age) // Fixed: was 'age'
      .skip(10)
      .take(20)
      .toArray();
    const duration = performance.now() - start;
    
    assert(duration < 100, 'Complex query should complete within 100ms');
    assert(results.length <= 20, 'Take should limit results');
    
    await context.dispose();
  });
  
  await runner.test('Memory usage with large results', async () => {
    context = await createTestContext();
    
    const categories : any = [];
    for (let i = 0; i < 200; i++) {
      categories.push({
        name: `Category ${i}`,
        description: 'x'.repeat(1000) 
      });
    }
    await context.categories.addRange(categories);
    
    const queries : any = [];
    for (let i = 0; i < 10; i++) {
      queries.push(context.categories.toArray());
    }
    
    const start = performance.now();
    await Promise.all(queries);
    const duration = performance.now() - start;
    
    assert(duration < 500, 'Parallel queries should complete efficiently');
    
    await context.dispose();
  });
  
  await runner.test('Index simulation performance', async () => {
    context = await createTestContext();
    
    const orders : any = [];
    const baseDate = new Date('2024-01-01');
    
    for (let i = 0; i < 300; i++) {
      orders.push({
        orderNumber: `ORD-${String(i).padStart(6, '0')}`,
        totalAmount: Math.random() * 1000,
        orderDate: new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000),
        status: ['pending', 'processing', 'completed'][i % 3],
        userId: (i % 10) + 1
      });
    }
    
    await context.orders.addRange(orders);
    
    const start = performance.now();
    const userOrders = await context.orders
      .where(o => o.userId === 5)
      .toArray();
    const duration = performance.now() - start;
    
    assert(userOrders.length === 30, 'Should find all orders for user');
    assert(duration < 50, 'Filtered query should be fast');
    
    await context.dispose();
  });
  
  await runner.test('Aggregation performance', async () => {
    context = await createTestContext();
    
    const products : any = [];
    for (let i = 0; i < 200; i++) {
      products.push({
        name: `Product ${i}`,
        price: Math.random() * 100,
        stock: Math.floor(Math.random() * 1000),
        isActive: true
      });
    }
    await context.products.addRange(products);
    
    const start = performance.now();
    const allProducts = await context.products.toArray();
    
    const totalValue = allProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const avgPrice = allProducts.reduce((sum, p) => sum + p.price, 0) / allProducts.length;
    const totalStock = allProducts.reduce((sum, p) => sum + p.stock, 0);
    
    const duration = performance.now() - start;
    
    assert(duration < 50, 'Aggregation should complete quickly');
    assert(totalValue > 0, 'Should calculate total value');
    assert(avgPrice > 0, 'Should calculate average price');
    
    await context.dispose();
  });
  
  await runner.test('Cache hit rate', async () => {
    context = await createTestContext();
    
    await context.tags.addRange([
      { name: 'cache-test-1', color: '#FF0000' },
      { name: 'cache-test-2', color: '#00FF00' },
      { name: 'cache-test-3', color: '#0000FF' }
    ]);
    
    const miss1Start = performance.now();
    await context.tags.toArray();
    const miss1Duration = performance.now() - miss1Start;
    
    const hitDurations : any = [];
    for (let i = 0; i < 5; i++) {
      const hitStart = performance.now();
      await context.tags.toArray();
      hitDurations.push(performance.now() - hitStart);
    }
    
    const avgHitDuration = hitDurations.reduce((a : any, b : any) => a + b, 0) / hitDurations.length;
    
    assert(
      avgHitDuration < miss1Duration * 0.5,
      'Cache hits should be significantly faster than misses'
    );
    
    await context.dispose();
  });
  
  await runner.test('Write batch efficiency', async () => {
    context = await createTestContext();
    
    const individualStart = performance.now();
    for (let i = 0; i < 20; i++) {
      await context.departments.add({
        name: `Individual Dept ${i}`,
        description: `Description ${i}`
      });
    }
    const individualDuration = performance.now() - individualStart;
    
    const batchItems  : any = [];
    for (let i = 0; i < 20; i++) {
      batchItems.push({
        name: `Batch Dept ${i}`,
        description: `Description ${i}`
      });
    }
    
    const batchStart = performance.now();
    await context.departments.addRange(batchItems);
    const batchDuration = performance.now() - batchStart;
    
    assert(
      batchDuration < individualDuration,
      'Batch operations should be faster than individual operations'
    );
    
    await context.dispose();
  });
  
await runner.test('Query plan optimization', async () => {
  context = await createTestContext();
  
  const parentCat = await context.categories.add({
    name: 'Electronics'
  });
  
  for (let i = 0; i < 50; i++) {
    await context.categories.add({
      name: `Subcategory ${i}`,
      parentCategoryId: parentCat.id
    });
  }
  
  const start1 = performance.now();
  const result1 = await context.categories
    .where(c => c.parentCategoryId === parentCat.id)
    .orderBy(c => c.name) // Fixed: was 'name'
    .take(10)
    .toArray();
  const duration1 = performance.now() - start1;
  
  const start2 = performance.now();
  const allCats = await context.categories.toArray();
  const result2 = allCats
    .filter(c => c.parentCategoryId === parentCat.id)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 10);
  const duration2 = performance.now() - start2;
  
  assertEqual(result1.length, 10);
  assertEqual(result1.length, result2.length);
  
  assert(
    duration1 <= duration2 * 1.5,
    'Query builder should optimize operations'
  );
  
  await context.dispose();
});
  
  runner.endGroup();
}