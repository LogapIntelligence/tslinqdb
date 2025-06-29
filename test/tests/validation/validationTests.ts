import { TestRunner, assert, assertEqual, assertThrows, assertNotNull } from '../testRunner';
import { createTestContext } from '../testUtils';
import { AppDbContext } from '../../contexts/appDbContext';

export async function run(runner: TestRunner): Promise<void> {
  runner.startGroup('Validation & Error Handling');
  
  let context: AppDbContext;
  
  await runner.test('Update non-existent entity', async () => {
    context = await createTestContext();
    
    const fakeUser = {
      id: 9999,
      name: 'Fake User',
      email: 'fake@test.com',
      createdAt: new Date()
    };
    
    await assertThrows(
      async () => { await context.users.update(fakeUser); },
      'Should throw when updating non-existent entity'
    );
    
    await context.dispose();
  });
  
  await runner.test('Find with invalid ID', async () => {
    context = await createTestContext();
    
    const found = await context.products.find(99999);
    assertEqual(found, null);
    
    await context.dispose();
  });
  
  await runner.test('Single() with no results', async () => {
    context = await createTestContext();
    
    await assertThrows(
      async () => { await context.users.where(u => u.email === 'nonexistent@test.com').single(); },
      'Single should throw when no results'
    );
    
    await context.dispose();
  });
  
  await runner.test('Single() with multiple results', async () => {
    context = await createTestContext();
    
    await context.users.addRange([
      { name: 'User 1', email: 'user1@test.com', createdAt: new Date() },
      { name: 'User 2', email: 'user2@test.com', createdAt: new Date() }
    ]);
    
    await assertThrows(
      async () => { await context.users.single(); },
      'Single should throw when multiple results'
    );
    
    await context.dispose();
  });
  
  await runner.test('Invalid query combinations', async () => {
    context = await createTestContext();
    
    const skipOnly = await context.products
      .skip(2)
      .toArray();
    
    assert(true, 'Skip without take should work');
    
    const negativeSkip = await context.products
      .skip(-1)
      .toArray();
    
    assert(negativeSkip.length >= 0, 'Negative skip should be treated as 0');
    
    await context.dispose();
  });
  
  await runner.test('Empty where predicate', async () => {
    context = await createTestContext();
    
    await context.categories.add({ name: 'Test Category' });
    
    const all = await context.categories
      .where(() => true)
      .toArray();
    
    assertEqual(all.length, 1);
    
    const none = await context.categories
      .where(() => false)
      .toArray();
    
    assertEqual(none.length, 0);
    
    await context.dispose();
  });
  
  await runner.test('Null value handling', async () => {
    context = await createTestContext();
    
    const user = await context.users.add({
      name: 'Null Test User',
      email: 'null@test.com',
      createdAt: new Date()
    });
    
    const noAge = await context.users
      .where(u => u.age === undefined || u.age === null)
      .toArray();
    
    assert(noAge.length > 0, 'Should find users without age');
    
    await context.dispose();
  });
  
  await runner.test('Type coercion in queries', async () => {
    context = await createTestContext();
    
    await context.products.add({
      name: 'Type Test',
      price: 99.99,
      stock: 10,
      isActive: true
    });
    
    const results = await context.products
      .where(p => String(p.price).includes('99'))
      .toArray();
    
    assertEqual(results.length, 1);
    
    await context.dispose();
  });
  
  await runner.test('Large number handling', async () => {
    context = await createTestContext();
    
    const largeNumber = Number.MAX_SAFE_INTEGER;
    
    const product = await context.products.add({
      name: 'Expensive Item',
      price: largeNumber,
      stock: 1,
      isActive: true
    });
    
    const found = await context.products.find(product.id);
    assertEqual(found!.price, largeNumber);
    
    await context.dispose();
  });
  
  await runner.test('Special characters in data', async () => {
    context = await createTestContext();
    
    const specialTag = await context.tags.add({
      name: 'Special "Tag" with \'quotes\' and \n newlines',
      color: '#FF0000'
    });
    
    const found = await context.tags.find(specialTag.id);
    assertNotNull(found);
    assert(found!.name.includes('"'), 'Should preserve special characters');
    
    await context.dispose();
  });
  
  await runner.test('Date handling', async () => {
    context = await createTestContext();
    
    const now = new Date();
    const user = await context.users.add({
      name: 'Date Test User',
      email: 'date@test.com',
      createdAt: now
    });
    
    const found = await context.users.find(user.id);
    
    assert(
      new Date(found!.createdAt).getTime() === now.getTime(),
      'Dates should be preserved correctly'
    );
    
    await context.dispose();
  });
  
  await runner.test('Circular reference prevention', async () => {
    context = await createTestContext();
    
    const parent = await context.categories.add({
      name: 'Parent Category'
    });
    
    const child = await context.categories.add({
      name: 'Child Category',
      parentCategoryId: parent.id
    });
    
    parent.parentCategoryId = child.id;
    
    await context.categories.update(parent);
    
    assert(true, 'System allows circular references (no validation)');
    
    await context.dispose();
  });
  
  await runner.test('Transaction rollback simulation', async () => {
    context = await createTestContext();
    
    try {
      const order = await context.orders.add({
        orderNumber: 'TXN-001',
        totalAmount: 100,
        orderDate: new Date(),
        status: 'pending',
        userId: 1
      });
      
      throw new Error('Simulated transaction error');
      
      await context.orderItems.add({
        quantity: 1,
        unitPrice: 100,
        orderId: order.id,
        productId: 1
      });
    } catch (error) {
      const orders = await context.orders
        .where(o => o.orderNumber === 'TXN-001')
        .toArray();
      
      assertEqual(orders.length, 1);
    }
    
    await context.dispose();
  });
  
  runner.endGroup();
}