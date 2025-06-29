import { TestRunner, assert, assertEqual } from '../testRunner';
import { createTestContext, seedTestData } from '../testUtils';
import { AppDbContext } from '../../contexts/appDbContext';
import { Where } from '../../../src/query/expressions';

export async function run(runner: TestRunner): Promise<void> {
  runner.startGroup('Query System');
  
  let context: AppDbContext;
  
  context = await createTestContext();
  await seedTestData(context);
  
  await runner.test('Basic where clause', async () => {
    console.log(await context.users.toArray());
    const users = await context.users
      .where(u => u.age! > 25)
      .toArray();
    
    assertEqual(users.length, 1);
    assertEqual(users[0].name, 'Alice Johnson');
  });
  
  await runner.test('Multiple where clauses', async () => {
    const products = await context.products
      .where(p => p.price < 100)
      .where(p => p.isActive === true)
      .toArray();
    
    assertEqual(products.length, 2);
  });
  
  await runner.test('Where expressions - equality', async () => {
    const users = await context.users
      .where(Where.eq('email', 'alice@test.com'))
      .toArray();
    
    assertEqual(users.length, 1);
    assertEqual(users[0].name, 'Alice Johnson');
  });
  
  await runner.test('Where expressions - greater than', async () => {
    const products = await context.products
      .where(Where.gt('price', 50))
      .toArray();
    
    assertEqual(products.length, 3);
  });
  
  await runner.test('Where expressions - contains', async () => {
    const users = await context.users
      .where(Where.contains('email', 'test.com'))
      .toArray();
    
    assertEqual(users.length, 3);
  });
  
  await runner.test('Where expressions - AND', async () => {
    const products = await context.products
      .where(Where.and(
        Where.gt('price', 50),
        Where.eq('isActive', true)
      ))
      .toArray();
    
    assertEqual(products.length, 2);
  });
  
  await runner.test('Where expressions - OR', async () => {
    const products = await context.products
      .where(Where.or(
        Where.lt('price', 50),
        Where.eq('stock', 0)
      ))
      .toArray();
    
    assertEqual(products.length, 2);
  });
  
  await runner.test('Select projection', async () => {
    const projections = await context.users
      .select('name', 'email')
      .toArray();
    
    assertEqual(projections.length, 3);
    assert(!('age' in projections[0]), 'Age should not be in projection');
    assert('name' in projections[0], 'Name should be in projection');
  });
  
  await runner.test('OrderBy ascending', async () => {
    const products = await context.products
      .orderBy('price')
      .toArray();
    
    assertEqual(products[0].name, 'Mouse');
    assertEqual(products[3].name, 'Laptop');
  });
  
  await runner.test('OrderBy descending', async () => {
    const products = await context.products
      .orderByDescending('stock')
      .toArray();
    
    assertEqual(products[0].name, 'Mouse');
    assertEqual(products[0].stock, 100);
  });
  
  await runner.test('Skip and Take', async () => {
    const products = await context.products
      .orderBy('price')
      .skip(1)
      .take(2)
      .toArray();
    
    assertEqual(products.length, 2);
    assertEqual(products[0].name, 'Keyboard');
  });
  
  await runner.test('First', async () => {
    const user = await context.users
      .orderBy('name')
      .first();
    
    assert(user !== null, 'User should not be null');
    assertEqual(user!.name, 'Alice Johnson');
  });
  
  await runner.test('FirstOrDefault', async () => {
    const defaultUser = { 
      id: 0, 
      name: 'Default', 
      email: 'default@test.com',
      createdAt: new Date()
    };
    
    const user = await context.users
      .where(u => u.age === 999)
      .firstOrDefault(defaultUser);
    
    assertEqual(user.name, 'Default');
  });
  
  await runner.test('Count', async () => {
    const totalCount = await context.products.count();
    assertEqual(totalCount, 4);
    
    const activeCount = await context.products
      .where(p => p.isActive === true)
      .count();
    assertEqual(activeCount, 3);
  });
  
  await runner.test('Any with predicate', async () => {
    const hasExpensive = await context.products
      .any(p => p.price > 500);
    assertEqual(hasExpensive, true);
    
    const hasVeryExpensive = await context.products
      .any(p => p.price > 5000);
    assertEqual(hasVeryExpensive, false);
  });
  
  await runner.test('All predicate', async () => {
    const allHaveStock = await context.products
      .all(p => p.stock >= 0);
    assertEqual(allHaveStock, true);
    
    const allActive = await context.products
      .all(p => p.isActive === true);
    assertEqual(allActive, false);
  });
  
  await runner.test('Complex query chain', async () => {
    const results = await context.products
      .where(p => p.isActive === true)
      .where(p => p.stock > 0)
      .orderByDescending('price')
      .skip(1)
      .take(2)
      .select('name', 'price')
      .toArray();
    
    assertEqual(results.length, 2);
    assert(!('stock' in results[0]), 'Stock should not be in projection');
  });
  
  await runner.test('Empty result handling', async () => {
    const noResults = await context.users
      .where(u => u.email === 'nonexistent@test.com')
      .toArray();
    
    assertEqual(noResults.length, 0);
  });
  
  await context.dispose();
  
  runner.endGroup();
}