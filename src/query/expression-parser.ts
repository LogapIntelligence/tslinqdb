export class ExpressionParser {
  static compile<T, R>(expr: (item: T) => R): (item: T) => R {
    return expr;
  }

  static extractPropertyPath<T>(expr: (item: T) => any): string {
    const propertyPath: string[] = [];
    
    const handler: ProxyHandler<any> = {
      get(target: any, prop: string | symbol): any {
        if (typeof prop === 'string') {
          propertyPath.push(prop);
        }

        return new Proxy({}, handler);
      }
    };
    
    const proxy = new Proxy({}, handler) as T;
    
    try {
      expr(proxy);
    } catch {
    }
    
    if (propertyPath.length === 0) {
      throw new Error('Could not extract property from expression');
    }
    
    return propertyPath.join('.');
  }

  static extractPropertyPathFallback<T>(expr: (item: T) => any): string {
    const funcStr = expr.toString();
    
    const match = funcStr.match(/(?:function\s*\(([^)]*)\)|(?:\(([^)]*)\)|([^\s=>]+))\s*=>)\s*(.+)/);
    
    if (!match) {
      throw new Error('Invalid expression format');
    }
    
    const paramName = match[1] || match[2] || match[3];
    const body = match[4].trim();
    
    const cleanBody = body.replace(/^return\s+/, '').replace(/;$/, '');
    
    const propertyMatch = cleanBody.match(new RegExp(`${paramName}\\.([\\.\\w]+)`));
    
    if (propertyMatch) {
      return propertyMatch[1];
    }
    
    throw new Error('Could not extract property from expression');
  }
}