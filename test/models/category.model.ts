import 'reflect-metadata';
import { Column, ForeignKey, PrimaryKey, Table } from '../../src/decorators/column';

@Table('categories')
export class Category {
  @PrimaryKey()
  @Column({ type: 'number' })
  id!: number;

  @Column({ type: 'string' })
  name!: string;

  @Column({ type: 'string', nullable: true })
  description?: string;

  @ForeignKey(() => Category)
  parentCategoryId?: number;

  parentCategory?: Category;
  childCategories?: Category[];
}