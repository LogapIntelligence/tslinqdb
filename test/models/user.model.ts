import 'reflect-metadata';
import { Column, ForeignKey, PrimaryKey, Table } from '../../src/decorators/column';
import { Department } from './department.model';

@Table('users')
export class User {
  @PrimaryKey()
  @Column({ type: 'number' })
  id!: number;

  @Column({ type: 'string' })
  name!: string;

  @Column({ type: 'string', unique: true })
  email!: string;

  @Column({ type: 'number', nullable: true })
  age?: number;

  @Column({ type: 'date' })
  createdAt!: Date;

  @ForeignKey(() => Department)
  departmentId?: number;

  department?: Department;
}