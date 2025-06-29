import 'reflect-metadata';
import { Column, ForeignKey, PrimaryKey, Table } from '../../src/decorators/column';
import { User } from './user.model';
import { OrderItem } from './orderItem.model';

@Table('orders')
export class Order {
  @PrimaryKey()
  @Column({ type: 'number' })
  id!: number;

  @Column({ type: 'string' })
  orderNumber!: string;

  @Column({ type: 'number' })
  totalAmount!: number;

  @Column({ type: 'date' })
  orderDate!: Date;

  @Column({ type: 'string' })
  status!: string;

  @ForeignKey(() => User)
  userId!: number;

  user?: User;
  orderItems?: OrderItem[];
}