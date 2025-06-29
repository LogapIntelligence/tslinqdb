export class ExpressionParser {
  /**
   * Parses a lambda expression and returns a compiled evaluator
   */
  static compile<T, R>(expr: (item: T) => R): (item: T) => R {
    const funcStr = expr.toString();
    const match = funcStr.match(/(?:function\s*\(([^)]*)\)|(?:\(([^)]*)\)|([^\s=>]+))\s*=>)\s*(.+)/);
    
    if (!match) {
      throw new Error('Invalid expression format');
    }
    
    const paramName = match[1] || match[2] || match[3];
    const body = match[4].trim();
    
    // Remove return statement if present
    const expression = body.replace(/^return\s+/, '').replace(/;$/, '');
    
    // Create a compiled function that evaluates the expression
    return new Function('item', `
      const ${paramName} = item;
      return ${this.transpileExpression(expression, paramName)};
    `) as (item: T) => R;
  }

  /**
   * Transpiles an expression to handle method calls and property access
   */
  private static transpileExpression(expression: string, paramName: string): string {
    let result = expression;

    // Handle method calls
    result = result.replace(
      new RegExp(`(${paramName}(?:\\.[\\w]+)*)\\.([\\w]+)\\(([^)]*)\\)`, 'g'),
      (match, objPath, method, args) => {
        const obj = objPath.replace(new RegExp(`^${paramName}`), 'item');
        
        switch (method) {
          case 'contains':
            return `String(${obj}).includes(${args})`;
          case 'toLowerCase':
          case 'toLower':
            return `String(${obj}).toLowerCase()`;
          case 'toUpperCase':
          case 'toUpper':
            return `String(${obj}).toUpperCase()`;
          case 'startsWith':
            return `String(${obj}).startsWith(${args})`;
          case 'endsWith':
            return `String(${obj}).endsWith(${args})`;
          case 'trim':
            return `String(${obj}).trim()`;
          default:
            return `${obj}.${method}(${args})`;
        }
      }
    );

    // Handle property access
    result = result.replace(
      new RegExp(`${paramName}(?=\\.|\\s|$|[^\\w])`, 'g'),
      'item'
    );

    return result;
  }

  /**
   * Extracts the property path from an expression
   */
  static extractPropertyPath<T>(expr: (item: T) => any): string {
    const funcStr = expr.toString();
    const match = funcStr.match(/(?:function\s*\(([^)]*)\)|(?:\(([^)]*)\)|([^\s=>]+))\s*=>)\s*(.+)/);
    
    if (!match) {
      throw new Error('Invalid expression format');
    }
    
    const paramName = match[1] || match[2] || match[3];
    const body = match[4].trim();
    
    // Extract property path (e.g., "p.name" -> "name", "p.address.city" -> "address.city")
    const propertyMatch = body.match(new RegExp(`${paramName}\\.([\\.\\w]+)`));
    if (propertyMatch) {
      return propertyMatch[1];
    }
    
    throw new Error('Could not extract property from expression');
  }
}