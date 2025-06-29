import 'reflect-metadata';
import { Column, PrimaryKey, Table } from '../../src/decorators/column';

@Table('departments')
export class Department {
  @PrimaryKey()
  @Column({ type: 'number' })
  id!: number;

  @Column({ type: 'string' })
  name!: string;

  @Column({ type: 'string', nullable: true })
  description?: string;
}