import 'reflect-metadata';
import { TestRunner } from './tests/testRunner';
import { cleanDatabase } from './tests/testUtils';

async function main() {
  try {
    await cleanDatabase();
    
    const runner = new TestRunner();
    await runner.runAll();
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
    process.exit(1);
  }
}

main();