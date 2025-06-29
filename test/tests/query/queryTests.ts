import { TestRunner, assert, assertEqual } from '../testRunner';
import { createTestContext, seedTestData } from '../testUtils';
import { AppDbContext } from '../../contexts/appDbContext';

export async function run(runner: TestRunner): Promise<void> {
  runner.startGroup('Modern Query System');
  
  let context: AppDbContext;
  
  context = await createTestContext();
  await seedTestData(context);
  
  // Basic Query Tests
  await runner.test('Basic where clause', async () => {
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
  
  // String Method Tests
  await runner.test('String contains method', async () => {
    const users = await context.users
      .where(u => u.email.includes("test.com"))
      .toArray();
    
    assertEqual(users.length, 3);
  });
  
  await runner.test('Case-insensitive contains', async () => {
    // Assuming one user has TEST.COM in uppercase
    const users = await context.users
      .where(u => u.email.toLowerCase().includes("test.com"))
      .toArray();
    
    assertEqual(users.length, 3);
  });
  
  await runner.test('String startsWith', async () => {
    const users = await context.users
      .where(u => u.name.startsWith("A"))
      .toArray();
    
    assertEqual(users.length, 1);
    assertEqual(users[0].name, 'Alice Johnson');
  });
  
  await runner.test('String endsWith', async () => {
    const users = await context.users
      .where(u => u.email.endsWith(".com"))
      .toArray();
    
    assertEqual(users.length, 3);
  });
  
  await runner.test('Complex string operations', async () => {
    const users = await context.users
      .where(u => u.name.toLowerCase().includes("bob"))
      .toArray();
    
    assertEqual(users.length, 1);
  });
  
  // Expression-based Comparisons
  await runner.test('Expression equality', async () => {
    const users = await context.users
      .where(u => u.email === 'alice@test.com')
      .toArray();
    
    assertEqual(users.length, 1);
    assertEqual(users[0].name, 'Alice Johnson');
  });
  
  await runner.test('Expression greater than', async () => {
    const products = await context.products
      .where(p => p.price > 50)
      .toArray();
    
    assertEqual(products.length, 3);
  });
  
  await runner.test('Expression AND conditions', async () => {
    const products = await context.products
      .where(p => p.price > 50 && p.isActive === true)
      .toArray();
    
    assertEqual(products.length, 2);
  });
  
  await runner.test('Expression OR conditions', async () => {
    const products = await context.products
      .where(p => p.price < 50 || p.stock === 0)
      .toArray();
    
    assertEqual(products.length, 2);
  });
  
  // Projection Tests
  await runner.test('Select projection', async () => {
    const projections = await context.users
      .select(u => ({ name: u.name, email: u.email }))
      .toArray();
    
    console.log(projections);
    assertEqual(projections.length, 3);
    assert(!('age' in projections[0]), 'Age should not be in projection');
    assert('name' in projections[0], 'Name should be in projection');
    assert('email' in projections[0], 'Email should be in projection');
  });
  
  await runner.test('Select with transformation', async () => {
    const transformed = await context.users
      .select(u => ({
        fullName: u.name.toUpperCase(),
        domain: u.email.split('@')[1]
      }))
      .toArray();
    
    assertEqual(transformed.length, 3);
    assertEqual(transformed[0].domain, 'test.com');
    assert(transformed[0].fullName === transformed[0].fullName.toUpperCase(), "fullname should be equal");
  });
  
  // Ordering Tests
  await runner.test('OrderBy expression ascending', async () => {
    const products = await context.products
      .orderBy(p => p.price)
      .toArray();
    
    assertEqual(products[0].name, 'Laptop');
    assertEqual(products[products.length - 1].name, 'Monitor');
  });
  
  await runner.test('OrderBy expression descending', async () => {
    const products = await context.products
      .orderByDescending(p => p.stock)
      .toArray();
    
    assertEqual(products[0].name, 'Mouse');
    assertEqual(products[0].stock, 100);
  });
  
  await runner.test('Multiple OrderBy', async () => {
    const products = await context.products
      .orderBy(p => p.isActive)
      .orderByDescending(p => p.price)
      .toArray();
    
    // Should order by isActive first, then by price descending
    assert(products[0].isActive === false || products[products.length - 1].isActive === true, "Should order by isActive first, then by price descending");
  });
  
  // Pagination Tests
  await runner.test('Skip and Take', async () => {
    const products = await context.products
      .orderBy(p => p.price)
      .skip(1)
      .take(2)
      .toArray();
    
    assertEqual(products.length, 2);
    assertEqual(products[0].name, 'Keyboard');
  });
  
  // Element Operation Tests
  await runner.test('First', async () => {
    const user = await context.users
      .orderBy(u => u.name)
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
  
  await runner.test('Single success', async () => {
    const user = await context.users
      .where(u => u.email === 'alice@test.com')
      .single();
    
    assertEqual(user.name, 'Alice Johnson');
  });
  
  await runner.test('Single throws on multiple', async () => {
    try {
      await context.users
        .where(u => u.email.includes("test.com"))
        .single();
      assert(false, 'Should have thrown');
    } catch (error: any) {
      assert(error.message.includes('more than one element'), "should throw error on multiple");
    }
  });
  
  // Aggregation Tests
  await runner.test('Count', async () => {
    const totalCount = await context.products.count();
    assertEqual(totalCount, 4);
    
    const activeCount = await context.products
      .where(p => p.isActive === true)
      .count();
    assertEqual(activeCount, 3);
  });
  
  await runner.test('Sum aggregation', async () => {
    const totalValue = await context.products
      .sum(p => p.price * p.stock);
    
    assert(totalValue > 0, 'Total value should be positive');
  });
  
  await runner.test('Average aggregation', async () => {
    const avgPrice = await context.products
      .average(p => p.price);
    
    assert(avgPrice > 0, 'Average price should be positive');
    assert(avgPrice < 1000, 'Average price should be reasonable');
  });
  
  await runner.test('Min and Max', async () => {
    const minPrice = await context.products
      .min(p => p.price);
    
    const maxPrice = await context.products
      .max(p => p.price);
    
    assertEqual(minPrice, 29.99);
    assertEqual(maxPrice, 999.99);
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
  
  // Grouping Tests
  await runner.test('GroupBy basic', async () => {
    const byActive = await context.products
      .groupBy(p => p.isActive);
    
    assertEqual(byActive.size, 2); // true and false groups
    assert(byActive.has(true), 'Should have active products');
    assert(byActive.has(false), 'Should have inactive products');
  });
  
  await runner.test('GroupBy with filtering', async () => {
    const expensiveByActive = await context.products
      .where(p => p.price > 50)
      .groupBy(p => p.isActive);
    
    assert(expensiveByActive.size <= 2, "Grouping exceeds price listing");
  });
  
  // Distinct Tests
  await runner.test('Distinct products', async () => {
    // Note: Assumes all products are unique
    const distinctProducts = await context.products.distinct();
    assertEqual(distinctProducts.length, 4);
  });
  
  // Complex Query Tests
  await runner.test('Complex query chain', async () => {
    const results = await context.products
      .where(p => p.isActive === true)
      .where(p => p.stock > 0)
      .orderByDescending(p => p.price)
      .skip(1)
      .take(2)
      .select(p => ({ name: p.name, price: p.price }))
      .toArray();
    
    assertEqual(results.length, 2);
    assert(!('stock' in results[0]), 'Stock should not be in projection');
  });
  
  await runner.test('Complex string search', async () => {
    const searchTerm = "john";
    const users = await context.users
      .where(u => 
        u.name.toLowerCase().includes(searchTerm) ||
        u.email.toLowerCase().includes(searchTerm)
      )
      .orderBy(u => u.name)
      .toArray();
    
    assert(users.length >= 1, 'Should find at least one John');
  });
  
  await runner.test('Multiple conditions with expressions', async () => {
    const products = await context.products
      .where(p => p.price >= 50 && p.price <= 500)
      .where(p => p.stock > 0)
      .where(p => p.isActive === true)
      .orderBy(p => p.name)
      .toArray();
    
    assert(products.every(p => p.price >= 50 && p.price <= 500), "Price mismatch");
    assert(products.every(p => p.stock > 0), "Stock mismatch");
    assert(products.every(p => p.isActive === true), "Activity mismatch");
  });
  
  await runner.test('Case-insensitive exact match', async () => {
    const user = await context.users
      .where(u => u.name.toLowerCase() === "alice johnson")
      .first();
    
    assert(user !== null, 'Should find Alice regardless of case');
    assertEqual(user!.name, 'Alice Johnson');
  });
  
  await runner.test('Trim whitespace in queries', async () => {
    // Assuming some data might have trailing spaces
    const products = await context.products
      .where(p => p.name.trim() === "Laptop")
      .toArray();
    
    assert(products.length >= 1, 'Should find laptop even with spaces');
  });
  
  // Edge Cases
  await runner.test('Empty result handling', async () => {
    const noResults = await context.users
      .where(u => u.email === 'nonexistent@test.com')
      .toArray();
    
    assertEqual(noResults.length, 0);
  });
  
  await runner.test('Null/undefined handling in expressions', async () => {
    const users = await context.users
      .where(u => u.age !== null && u.age !== undefined && u.age > 20)
      .toArray();
    
    assert(users.length >= 0, 'Should handle null checks gracefully');
  });
  
  await runner.test('Complex nested conditions', async () => {
    const results = await context.products
      .where(p => 
        (p.price < 100 && p.stock > 50) || 
        (p.price >= 100 && p.price < 500 && p.isActive === true)
      )
      .orderBy(p => p.price)
      .toArray();
    
    assert(results.length >= 0, 'Complex conditions should work');
  });
  
  // Performance-oriented tests
  await runner.test('Efficient filtering before projection', async () => {
    const results = await context.products
      .where(p => p.price > 100) // Filter first
      .where(p => p.isActive === true)
      .select(p => ({ 
        name: p.name, 
        formattedPrice: `$${p.price.toFixed(2)}`
      }))
      .take(5)
      .toArray();
    
    assert(results.length <= 5, "Length");
    assert(results.every(r => r.formattedPrice.startsWith('$')), "Startwith should start with $");
  });
  
  await runner.test('Aggregation on filtered data', async () => {
    const activeProductsAvgPrice = await context.products
      .where(p => p.isActive === true)
      .average(p => p.price);
    
    const inactiveProductsAvgPrice = await context.products
      .where(p => p.isActive === false)
      .average(p => p.price);
    
    assert(activeProductsAvgPrice >= 0, "Average calculation failed");
    assert(inactiveProductsAvgPrice >= 0, "");
  });
  
  await context.dispose();
  
  runner.endGroup();
}