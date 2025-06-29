import { TestRunner, assert, assertEqual } from '../testRunner';
import { createTestContext, delay } from '../testUtils';
import { AppDbContext } from '../../contexts/appDbContext';
import { clear } from 'console';

export async function run(runner: TestRunner): Promise<void> {
  runner.startGroup('Concurrency & Race Conditions');
  
  let context: AppDbContext;
  
  await runner.test('Concurrent reads - no interference', async () => {
    context = await createTestContext();
    clear
    const testData = Array.from({ length: 10 }, (_, i) => ({
      name: `Concurrent Product ${i}`,
      price: i * 10,
      stock: 100,
      isActive: true
    }));
    
    await context.products.addRange(testData);
    
    const readPromises = Array.from({ length: 20 }, () => 
      context.products
        .where(p => p.price > 50)
        .toArray()
    );
    
    const results = await Promise.all(readPromises);

    const expectedLength = results[0].length;
    const expectedIds = results[0].map(p => p.id).sort();
    
    for (const result of results) {
      assertEqual(result.length, expectedLength);
      const resultIds = result.map(p => p.id).sort();
      assertEqual(JSON.stringify(resultIds), JSON.stringify(expectedIds));
    }
    
    await context.dispose();
  });
  
  await runner.test('Concurrent writes to different tables - no conflicts', async () => {
    context = await createTestContext();
    
    const userWrites = Array.from({ length: 5 }, (_, i) => 
      context.users.add({
        name: `Concurrent User ${i}`,
        email: `concurrent${i}@test.com`,
        createdAt: new Date()
      })
    );
    
    const productWrites = Array.from({ length: 5 }, (_, i) => 
      context.products.add({
        name: `Concurrent Product ${i}`,
        price: i * 20,
        stock: 50,
        isActive: true
      })
    );
    
    const categoryWrites = Array.from({ length: 5 }, (_, i) => 
      context.categories.add({
        name: `Concurrent Category ${i}`
      })
    );
    
    const allWrites = [...userWrites, ...productWrites, ...categoryWrites];
    await Promise.all(allWrites);
    
    const [users, products, categories] = await Promise.all([
      context.users.toArray(),
      context.products.toArray(),
      context.categories.toArray()
    ]);
    
    assertEqual(users.length, 5);
    assertEqual(products.length, 5);
    assertEqual(categories.length, 5);
    
    await context.dispose();
  });
  
  await runner.test('Concurrent writes to same table - unique IDs', async () => {
    context = await createTestContext();
    
    const writePromises = Array.from({ length: 10 }, (_, i) => 
      context.orders.add({
        orderNumber: `CONC-${i}`,
        totalAmount: i * 100,
        orderDate: new Date(),
        status: 'pending',
        userId: 1
      })
    );
    
    const orders = await Promise.all(writePromises);
    
    const ids = orders.map(o => o.id);
    const uniqueIds = new Set(ids);
    assertEqual(uniqueIds.size, 10, 'All orders should have unique IDs');
    
    const allOrders = await context.orders.toArray();
    assertEqual(allOrders.length, 10);
    
    const orderNumbers = allOrders.map(o => o.orderNumber).sort();
    const expectedNumbers = Array.from({ length: 10 }, (_, i) => `CONC-${i}`).sort();
    assertEqual(JSON.stringify(orderNumbers), JSON.stringify(expectedNumbers));
    
    await context.dispose();
  });
  

  
  await runner.test('Concurrent stock updates - demonstrating race condition', async () => {
    context = await createTestContext();
    
    const initialStock = 1000;
    const product = await context.products.add({
      name: 'Race Condition Product',
      price: 100,
      stock: initialStock,
      isActive: true
    });
    
    const decrementAmount = 10;
    const concurrentUpdates = 10;
    
    const unsafeUpdates = Array.from({ length: concurrentUpdates }, async () => {

      const current = await context.products.find(product.id);
      if (current) {
        await delay(Math.random() * 10);
        
        current.stock -= decrementAmount;
        await context.products.update(current);
      }
    });
    
    await Promise.all(unsafeUpdates);
    
    const final = await context.products.find(product.id);
    
    const expectedStock = initialStock - (decrementAmount * concurrentUpdates);
    
    assert(
      final!.stock <= initialStock,
      'Stock should have decreased'
    );
    
    if (final!.stock !== expectedStock) {
      console.log(`Race condition detected: Expected ${expectedStock}, got ${final!.stock}`);
      console.log(`Lost updates: ${(expectedStock - final!.stock) / decrementAmount} operations`);
    }
    
    await context.dispose();
  });
  
  await runner.test('Concurrent price updates - last write wins', async () => {
    context = await createTestContext();
    
    const product = await context.products.add({
      name: 'Price Update Product',
      price: 100,
      stock: 50,
      isActive: true
    });
    
    const priceUpdates = Array.from({ length: 5 }, async (_, i) => {
      const current = await context.products.find(product.id);
      if (current) {

        await delay(Math.random() * 20);
        current.price = (i + 1) * 100; 
        return await context.products.update(current);
      }
    });
    
    await Promise.all(priceUpdates);
    
    const final = await context.products.find(product.id);
    assert(
      final!.price >= 100 && final!.price <= 500,
      'Price should be from one of the updates'
    );
    
    console.log(`Final price: ${final!.price} (last write wins)`);
    
    await context.dispose();
  });
  
  await runner.test('Concurrent order and inventory updates', async () => {
    context = await createTestContext();
    
    const products = await Promise.all([
      context.products.add({
        name: 'Popular Item 1',
        price: 29.99,
        stock: 50,
        isActive: true
      }),
      context.products.add({
        name: 'Popular Item 2',
        price: 49.99,
        stock: 30,
        isActive: true
      })
    ]);
    
    const orderPromises = Array.from({ length: 10 }, async (_, i) => {
      const productIndex = i % 2; 
      const product = products[productIndex];
      const quantity = Math.floor(Math.random() * 3) + 1; 
      
      try {
        const current = await context.products.find(product.id);
        if (!current || current.stock < quantity) {
          return { success: false, reason: 'Out of stock', orderId: null };
        }
        
        const order = await context.orders.add({
          orderNumber: `CONC-ORDER-${i}`,
          totalAmount: current.price * quantity,
          orderDate: new Date(),
          status: 'pending',
          userId: 1
        });
        
        current.stock -= quantity;
        await context.products.update(current);
        
        return { success: true, orderId: order.id, productId: product.id, quantity };
      } catch (error) {
        return { success: false, reason: 'Error processing order', error };
      }
    });
    
    const orderResults = await Promise.all(orderPromises);
    
    const successfulOrders = orderResults.filter(r => r.success);
    const failedOrders = orderResults.filter(r => !r.success);
    
    console.log(`Successful orders: ${successfulOrders.length}`);
    console.log(`Failed orders: ${failedOrders.length}`);
    
    const finalProducts = await Promise.all(
      products.map(p => context.products.find(p.id))
    );
    
    finalProducts.forEach((product, idx) => {
      console.log(`${product!.name}: ${product!.stock} remaining (started with ${products[idx].stock})`);
      
      if (product!.stock < 0) {
        console.log(`WARNING: Negative stock detected! Race condition allowed overselling.`);
      }
    });
    
    await context.dispose();
  });
  
  await runner.test('Concurrent bulk operations', async () => {
    context = await createTestContext();
    
    const bulkOperations = Array.from({ length: 3 }, (batch) => {
      const items = Array.from({ length: 20 }, (_, i) => ({
        name: `Batch${batch}-Item${i}`,
        color: `#${String(batch).padStart(2, '0')}${String(i).padStart(4, '0')}`
      }));
      
      return context.tags.addRange(items);
    });
    
    const results = await Promise.all(bulkOperations);

    const allTags = await context.tags.toArray();
    assertEqual(allTags.length, 60);
    
    results.forEach((batchResult, index) => {
      assertEqual(
        batchResult.length, 
        20, 
        `Batch ${index} should have inserted 20 items`
      );
    });
    
    await context.dispose();
  });
  
await runner.test('Read-write interleaving - consistency check', async () => {
  context = await createTestContext();
  
  await context.tags.add({ name: 'initial', color: '#000000' });
  
  const results: any[] = [];
  let expectedCount = 1; 
  
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      await context.tags.add({
        name: `tag-${i}`,
        color: `#${String(i).padStart(6, '0')}`
      });
      expectedCount++;
    } else {
      const tags = await context.tags.toArray();
      results.push({
        operationIndex: i,
        count: tags.length,
        expectedCount: expectedCount
      });
      
      assertEqual(
        tags.length, 
        expectedCount, 
        `Read at index ${i} should see ${expectedCount} tags`
      );
    }
  }
  
  const finalTags = await context.tags.toArray();
  assertEqual(finalTags.length, 6);
  
  await context.dispose();
});

await runner.test('Cache invalidation during concurrent operations', async () => {
  context = await createTestContext();
  
  await context.users.add({
    name: 'Cache Test User',
    email: 'cache@test.com',
    createdAt: new Date()
  });
  
  const initialRead = await context.users.toArray();
  assertEqual(initialRead.length, 1);
  
  const write1Promise = context.users.add({
    name: 'User 2',
    email: 'user2@test.com',
    createdAt: new Date()
  });
  
  const write2Promise = context.users.add({
    name: 'User 3', 
    email: 'user3@test.com',
    createdAt: new Date()
  });
  
  await write1Promise;
  
  const read1 = await context.users.toArray();
  assert(read1.length >= 2, 'First read should see at least 2 users after first write');
  
  await write2Promise;

  const finalRead = await context.users.toArray();
  assertEqual(finalRead.length, 3, 'Final read should see all 3 users');
  
  await context.dispose();
});

await runner.test('True concurrent read-write behavior', async () => {
  context = await createTestContext();
  
  const writes: Promise<any>[] = [];
  const reads: Promise<number>[] = [];
  
  for (let i = 0; i < 5; i++) {
    writes.push(
      context.products.add({
        name: `Product ${i}`,
        price: i * 10,
        stock: 100,
        isActive: true
      })
    );
  }
  
  reads.push(context.products.count());
  
  await Promise.resolve();
  reads.push(context.products.count());
  
  await writes[0];
  reads.push(context.products.count());
  
  const writesComplete = await Promise.all(writes);
  const readCounts = await Promise.all(reads);
  
  for (let i = 1; i < readCounts.length; i++) {
    assert(
      readCounts[i] >= readCounts[i-1],
      `Read counts should be non-decreasing: ${readCounts}`
    );
  }

  const finalCount = await context.products.count();
  assertEqual(finalCount, 5);

  const allProducts = await context.products.toArray();
  const ids = allProducts.map(p => p.id);
  assertEqual(new Set(ids).size, 5, 'All products should have unique IDs');
  
  await context.dispose();
});

await runner.test('Cache coherence with rapid updates', async () => {
  context = await createTestContext();
  
  const iterations = 20;
  const results: boolean[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const user = await context.users.add({
      name: `User ${i}`,
      email: `user${i}@test.com`,
      createdAt: new Date()
    });

    const users = await context.users.toArray();
    const found = users.some(u => u.id === user.id);
    results.push(found);

    const count = await context.users.count();
    assertEqual(count, i + 1, `Count should be ${i + 1} after adding user ${i}`);
  }

  assert(
    results.every(r => r === true),
    'All reads should see their preceding writes'
  );
  
  await context.dispose();
});

  await runner.test('High concurrency stress test', async () => {
    context = await createTestContext();
    
    const concurrentOps = 100;
    const operations: Promise<any>[] = [];

    for (let i = 0; i < concurrentOps; i++) {
      const opType = i % 4;
      
      switch (opType) {
        case 0:
          operations.push(
            context.orders.add({
              orderNumber: `STRESS-${i}`,
              totalAmount: Math.random() * 1000,
              orderDate: new Date(),
              status: 'pending',
              userId: Math.floor(Math.random() * 10) + 1
            })
          );
          break;
          
        case 1:
          const items = Array.from({ length: 5 }, (_, j) => ({
            name: `Tag-${i}-${j}`,
            color: '#' + Math.floor(Math.random()*16777215).toString(16)
          }));
          operations.push(context.tags.addRange(items));
          break;
          
        case 2:
          operations.push(
            context.orders
              .where(o => o.totalAmount > 500)
              .toArray()
          );
          break;
          
        case 3:
          operations.push(context.orders.count());
          break;
      }
    }

    const startTime = Date.now();
    await Promise.all(operations);
    const duration = Date.now() - startTime;
    
    console.log(`Completed ${concurrentOps} concurrent operations in ${duration}ms`);

    const finalOrders = await context.orders.toArray();
    const finalTags = await context.tags.toArray();
    
    assert(finalOrders.length > 0, 'Should have created orders');
    assert(finalTags.length > 0, 'Should have created tags');
    
    await context.dispose();
  });
  
  runner.endGroup();
}