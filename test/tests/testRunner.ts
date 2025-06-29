export interface TestResult {
  name: string;
  passed: boolean;
  error?: Error;
  duration: number;
}

export interface TestGroup {
  name: string;
  tests: TestResult[];
}

export class TestRunner {
  private results: TestGroup[] = [];
  private currentGroup?: TestGroup;
  private totalTests = 0;
  private passedTests = 0;
  
  async runAll(): Promise<void> {
    console.log('\n🧪 Running TypeScript ORM Test Suite\n');
    console.log('═'.repeat(50));
    
    const testGroups = [
      './entity/entityTests',
      './query/queryTests',
      './relationships/relationshipTests',
      './storage/storageTests',
      './concurrency/concurrencyTests',
      './validation/validationTests',
      './performance/performanceTests'
    ];
    
    for (const groupPath of testGroups) {
      try {
        const module = await import(groupPath);
        await module.run(this);
      } catch (error) {
        console.error(`Failed to load test group ${groupPath}:`, error);
      }
    }
    
    this.printSummary();
  }
  
  startGroup(name: string): void {
    this.currentGroup = { name, tests: [] };
    console.log(`\n[${this.results.length + 1}/${7}] ${name}`);
    console.log('─'.repeat(40));
  }
  
  async test(name: string, fn: () => Promise<void> | void): Promise<void> {
    const start = performance.now();
    let passed = false;
    let error: Error | undefined;
    
    try {
      await fn();
      passed = true;
      this.passedTests++;
    } catch (e) {
      error = e as Error;
    }
    
    const duration = performance.now() - start;
    this.totalTests++;
    
    const result: TestResult = { name, passed, error, duration };
    this.currentGroup?.tests.push(result);
    
    const status = passed ? '✅' : '❌';
    const durationStr = `${duration.toFixed(2)}ms`;
    console.log(`  ${status} ${name} (${durationStr})`);
    
    if (error) {
      console.log(`     └─ ${error.message}`);
    }
  }
  
  endGroup(): void {
    if (this.currentGroup) {
      const passed = this.currentGroup.tests.filter(t => t.passed).length;
      const total = this.currentGroup.tests.length;
      console.log(`\n  Summary: ${passed}/${total} tests passed`);
      this.results.push(this.currentGroup);
      this.currentGroup = undefined;
    }
  }
  
  private printSummary(): void {
    console.log('\n' + '═'.repeat(50));
    console.log('\n📊 FINAL TEST RESULTS\n');
    
    this.results.forEach((group, i) => {
      const passed = group.tests.filter(t => t.passed).length;
      const total = group.tests.length;
      const status = passed === total ? '✅' : '❌';
      console.log(`${status} [${i + 1}/${this.results.length}] ${group.name}: ${passed}/${total}`);
    });
    
    console.log('\n' + '─'.repeat(50));
    const percentage = ((this.passedTests / this.totalTests) * 100).toFixed(1);
    const status = this.passedTests === this.totalTests ? '✅ SUCCESS' : '❌ FAILED';
    
    console.log(`\n${status}: ${this.passedTests}/${this.totalTests} Tests passed (${percentage}%)\n`);
    
    if (this.passedTests < this.totalTests) {
      console.log('Failed Tests:');
      this.results.forEach(group => {
        const failed = group.tests.filter(t => !t.passed);
        if (failed.length > 0) {
          console.log(`\n  ${group.name}:`);
          failed.forEach(test => {
            console.log(`    ❌ ${test.name}`);
            if (test.error) {
              console.log(`       ${test.error.message}`);
            }
          });
        }
      });
    }
    
    console.log('\n' + '═'.repeat(50) + '\n');
  }
}

export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`
    );
  }
}

export function assertNotNull<T>(value: T | null | undefined, message?: string): void {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected non-null value');
  }
}

export async function assertThrows(fn: () => Promise<void> | void, message?: string): Promise<void> {
  let threw = false;
  try {
    await fn();
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error(message || 'Expected function to throw');
  }
}