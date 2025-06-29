import { TestRunner, assert, assertEqual, assertNotNull } from '../testRunner';
import { createTestContext, seedTestData } from '../testUtils';
import { AppDbContext } from '../../contexts/appDbContext';

export async function run(runner: TestRunner): Promise<void> {
  runner.startGroup('Entity CRUD Operations');
  
  let context: AppDbContext;
  
  context = await createTestContext();
  
  await runner.test('Create single entity', async () => {
    const user = await context.users.add({
      name: 'Test User',
      email: 'test@example.com',
      age: 28,
      createdAt: new Date()
    });
    
    assertNotNull(user.id);
    assertEqual(user.name, 'Test User');
    assertEqual(user.email, 'test@example.com');
  });
  
  await runner.test('Auto-increment ID generation', async () => {
    const user1 = await context.users.add({
      name: 'User 1',
      email: 'user1@test.com',
      createdAt: new Date()
    });
    
    const user2 = await context.users.add({
      name: 'User 2',
      email: 'user2@test.com',
      createdAt: new Date()
    });
    
    assertEqual(user2.id, user1.id + 1);
  });
  
  await runner.test('Create multiple entities', async () => {
    const products = await context.products.addRange([
      { name: 'Product 1', price: 10.99, stock: 100, isActive: true },
      { name: 'Product 2', price: 20.99, stock: 50, isActive: true },
      { name: 'Product 3', price: 30.99, stock: 25, isActive: false }
    ]);
    
    assertEqual(products.length, 3);
    assertEqual(products[0].name, 'Product 1');
    assertEqual(products[2].isActive, false);
  });
  
  await runner.test('Read entity by ID', async () => {
    const created = await context.departments.add({
      name: 'HR',
      description: 'Human Resources'
    });
    
    const found = await context.departments.find(created.id);
    assertNotNull(found);
    assertEqual(found!.name, 'HR');
  });
  
  await runner.test('Update entity', async () => {
    const product = await context.products.add({
      name: 'Original Name',
      price: 99.99,
      stock: 10,
      isActive: true
    });
    
    product.name = 'Updated Name';
    product.price = 149.99;
    
    const updated = await context.products.update(product);
    assertEqual(updated.name, 'Updated Name');
    assertEqual(updated.price, 149.99);

    const fetched = await context.products.find(product.id);
    assertEqual(fetched!.name, 'Updated Name');
  });
  
  await runner.test('Delete entity', async () => {
    const tag = await context.tags.add({
      name: 'To Delete',
      color: '#FF0000'
    });
    
    await context.tags.remove(tag);
    
    const found = await context.tags.find(tag.id);
    assertEqual(found, null);
  });
  
  await runner.test('Handle nullable fields', async () => {
    const user = await context.users.add({
      name: 'No Age User',
      email: 'noage@test.com',
      createdAt: new Date()
    });
    
    assertNotNull(user.id);
    assertEqual(user.age, undefined);
  });
  
  await runner.test('Default values', async () => {
    const product = await context.products.add({
      name: 'Default Active',
      price: 50,
      stock: 100,
      isActive: true
    });
    
    assertEqual(product.isActive, true);
  });
  
  await runner.test('Create with explicit ID', async () => {
    const category = await context.categories.add({
      id: 999,
      name: 'Explicit ID Category'
    });
    
    assertEqual(category.id, 999);
  });
  
  await runner.test('Complex entity creation', async () => {
    const order = await context.orders.add({
      orderNumber: 'ORD-001',
      totalAmount: 299.99,
      orderDate: new Date(),
      status: 'pending',
      userId: 1
    });
    
    assertNotNull(order.id);
    assertEqual(order.orderNumber, 'ORD-001');
    assertEqual(order.userId, 1);
  });

  await context.dispose();
  
  runner.endGroup();
}