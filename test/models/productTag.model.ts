import 'reflect-metadata';
import { Column, ForeignKey, PrimaryKey, Table } from '../../src/decorators/column';
import { Product } from './product.model';
import { Tag } from './tag.model';

@Table('productTags')
export class ProductTag {
  @PrimaryKey()
  @Column({ type: 'number' })
  id!: number;

  @ForeignKey(() => Product)
  productId!: number;

  @ForeignKey(() => Tag)
  tagId!: number;

  product?: Product;
  tag?: Tag;
}