import 'reflect-metadata';
import { Column, PrimaryKey, Table } from '../../src/decorators/column';

@Table('products')
export class Product {
  @PrimaryKey()
  @Column({ type: 'number' })
  id!: number;

  @Column({ type: 'string' })
  name!: string;

  @Column({ type: 'number' })
  price!: number;

  @Column({ type: 'number' })
  stock!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}