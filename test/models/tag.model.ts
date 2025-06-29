import 'reflect-metadata';
import { Column, PrimaryKey, Table } from '../../src/decorators/column';

@Table('tags')
export class Tag {
  @PrimaryKey()
  @Column({ type: 'number' })
  id!: number;

  @Column({ type: 'string', unique: true })
  name!: string;

  @Column({ type: 'string' })
  color!: string;
}