import 'reflect-metadata';

export interface ColumnOptions {
  type?: 'string' | 'number' | 'boolean' | 'date' | 'json';
  nullable?: boolean;
  unique?: boolean;
  default?: any;
}

export function Column(options?: ColumnOptions) {
  return function (target: any, propertyKey: string | any) {
    const columns = Reflect.getMetadata('columns', target) || [];
    columns.push({ propertyKey, options });
    Reflect.defineMetadata('columns', columns, target);
  };
}

export function PrimaryKey() {
  return function (target: any, propertyKey: string | any) {
    Reflect.defineMetadata('primaryKey', propertyKey, target);
  };
}

export function ForeignKey(relatedEntity: () => any, relatedProperty?: string) {
  return function (target: any, propertyKey: string | any) {
    const foreignKeys = Reflect.getMetadata('foreignKeys', target) || [];
    foreignKeys.push({ propertyKey, relatedEntity, relatedProperty });
    Reflect.defineMetadata('foreignKeys', foreignKeys, target);
  };
}

export function Table(tableName: string) {
  return function (target: any) {
    Reflect.defineMetadata('tableName', tableName, target.prototype);
  };
}