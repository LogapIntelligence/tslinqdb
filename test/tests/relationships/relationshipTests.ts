import { TestRunner, assert, assertEqual, assertNotNull } from '../testRunner';
import { createTestContext } from '../testUtils';
import { AppDbContext } from '../../contexts/appDbContext';

export async function run(runner: TestRunner): Promise<void> {
  runner.startGroup('Relationship Management');
  
  let context: AppDbContext;
  
  context = await createTestContext();
  
  await runner.test('One-to-Many: User-Orders', async () => {
    const user = await context.users.add({
      name: 'John Customer',
      email: 'john@customer.com',
      createdAt: new Date()
    });

    const order1 = await context.orders.add({
      orderNumber: 'ORD-001',
      totalAmount: 100.50,
      orderDate: new Date(),
      status: 'completed',
      userId: user.id
    });
    
    const order2 = await context.orders.add({
      orderNumber: 'ORD-002',
      totalAmount: 250.75,
      orderDate: new Date(),
      status: 'pending',
      userId: user.id
    });
    
    const userOrders = await context.orders
      .where(o => o.userId === user.id)
      .toArray();
    
    assertEqual(userOrders.length, 2);
    assertEqual(userOrders[0].userId, user.id);
  });
  
  await runner.test('One-to-One: User-Profile', async () => {
    const user = await context.users.add({
      name: 'Profile User',
      email: 'profile@test.com',
      createdAt: new Date()
    });
    
    const profile = await context.profiles.add({
      bio: 'Test bio',
      avatarUrl: 'avatar.jpg',
      phoneNumber: '123-456-7890',
      birthDate: new Date('1990-01-01'),
      userId: user.id
    });
    
    const userProfile = await context.profiles
      .where(p => p.userId === user.id)
      .first();
    
    assertNotNull(userProfile);
    assertEqual(userProfile!.bio, 'Test bio');
  });
  
  await runner.test('Many-to-Many: Products-Tags', async () => {
    const laptop = await context.products.add({
      name: 'Gaming Laptop',
      price: 1299.99,
      stock: 10,
      isActive: true
    });
    
    const mouse = await context.products.add({
      name: 'Gaming Mouse',
      price: 79.99,
      stock: 50,
      isActive: true
    });
    
    const gamingTag = await context.tags.add({
      name: 'gaming',
      color: '#FF0000'
    });
    
    const electronicsTag = await context.tags.add({
      name: 'electronics',
      color: '#0000FF'
    });
    
    await context.productTags.addRange([
      { productId: laptop.id, tagId: gamingTag.id },
      { productId: laptop.id, tagId: electronicsTag.id },
      { productId: mouse.id, tagId: gamingTag.id },
      { productId: mouse.id, tagId: electronicsTag.id }
    ]);

    const gamingProducts = await context.productTags
      .where(pt => pt.tagId === gamingTag.id)
      .toArray();
    
    assertEqual(gamingProducts.length, 2);
    
    const laptopTags = await context.productTags
      .where(pt => pt.productId === laptop.id)
      .toArray();
    
    assertEqual(laptopTags.length, 2);
  });
  
  await runner.test('Self-referencing: Category hierarchy', async () => {
    const electronics = await context.categories.add({
      name: 'Electronics',
      description: 'Electronic items'
    });
    
    const computers = await context.categories.add({
      name: 'Computers',
      description: 'Computer equipment',
      parentCategoryId: electronics.id
    });
    
    const accessories = await context.categories.add({
      name: 'Accessories',
      description: 'Computer accessories',
      parentCategoryId: electronics.id
    });
    
    const childCategories = await context.categories
      .where(c => c.parentCategoryId === electronics.id)
      .toArray();
    
    assertEqual(childCategories.length, 2);
  });
  
  await runner.test('Order-OrderItems-Products complex relationship', async () => {
    const product1 = await context.products.add({
      name: 'Widget A',
      price: 25.00,
      stock: 100,
      isActive: true
    });
    
    const product2 = await context.products.add({
      name: 'Widget B',
      price: 35.00,
      stock: 50,
      isActive: true
    });
    
    const user = await context.users.add({
      name: 'Order User',
      email: 'orders@test.com',
      createdAt: new Date()
    });
    
    const order = await context.orders.add({
      orderNumber: 'ORD-COMPLEX-001',
      totalAmount: 120.00,
      orderDate: new Date(),
      status: 'processing',
      userId: user.id
    });
    
    await context.orderItems.addRange([
      {
        quantity: 2,
        unitPrice: 25.00,
        orderId: order.id,
        productId: product1.id
      },
      {
        quantity: 2,
        unitPrice: 35.00,
        orderId: order.id,
        productId: product2.id
      }
    ]);
    
    const orderItems = await context.orderItems
      .where(oi => oi.orderId === order.id)
      .toArray();
    
    assertEqual(orderItems.length, 2);
    assertEqual(orderItems[0].quantity * orderItems[0].unitPrice + 
                orderItems[1].quantity * orderItems[1].unitPrice, 120.00);
  });
  
  await runner.test('Include simulation (manual join)', async () => {
    const dept = await context.departments.add({
      name: 'IT Department',
      description: 'Information Technology'
    });
    
    await context.users.addRange([
      {
        name: 'IT User 1',
        email: 'it1@test.com',
        createdAt: new Date(),
        departmentId: dept.id
      },
      {
        name: 'IT User 2',
        email: 'it2@test.com',
        createdAt: new Date(),
        departmentId: dept.id
      }
    ]);
    
    const users = await context.users
      .where(u => u.departmentId === dept.id)
      .toArray();
    
    const department = await context.departments.find(dept.id);
    
    const usersWithDepartment = users.map(u => ({
      ...u,
      department
    }));
    
    assertEqual(usersWithDepartment.length, 2);
    assertNotNull(usersWithDepartment[0].department);
    assertEqual(usersWithDepartment[0].department!.name, 'IT Department');
  });
  
  await runner.test('Orphan records handling', async () => {
    const orphanOrder = await context.orders.add({
      orderNumber: 'ORPHAN-001',
      totalAmount: 99.99,
      orderDate: new Date(),
      status: 'abandoned',
      userId: 99999
    });
    
    const found = await context.orders.find(orphanOrder.id);
    assertNotNull(found);
    assertEqual(found!.userId, 99999);
  });
  
  await context.dispose();
  
  runner.endGroup();
}