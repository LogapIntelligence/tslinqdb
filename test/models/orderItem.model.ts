import 'reflect-metadata';
import { Column, ForeignKey, PrimaryKey, Table } from '../../src/decorators/column';
import { Order } from './order.model';
import { Product } from './product.model';

@Table('orderItems')
export class OrderItem {
  @PrimaryKey()
  @Column({ type: 'number' })
  id!: number;

  @Column({ type: 'number' })
  quantity!: number;

  @Column({ type: 'number' })
  unitPrice!: number;

  @ForeignKey(() => Order)
  orderId!: number;

  @ForeignKey(() => Product)
  productId!: number;

  order?: Order;
  product?: Product;
}