import { DbContext } from "../../src/core/dbContext"
import { DbSet } from "../../src/core/dbSet";
import { Department } from "../models/department.model";
import { Product } from "../models/product.model";
import { User } from "../models/user.model";
import { Order } from "../models/order.model";
import { OrderItem } from "../models/orderItem.model";
import { Profile } from "../models/profile.model";
import { Category } from "../models/category.model";
import { Tag } from "../models/tag.model";
import { ProductTag } from "../models/productTag.model";
import { dbConfig } from "../db.config";

export class AppDbContext extends DbContext {
  users!: DbSet<User>;
  products!: DbSet<Product>;
  departments!: DbSet<Department>;
  orders!: DbSet<Order>;
  orderItems!: DbSet<OrderItem>;
  profiles!: DbSet<Profile>;
  categories!: DbSet<Category>;
  tags!: DbSet<Tag>;
  productTags!: DbSet<ProductTag>;

  constructor() {
    super(dbConfig);
  }

  protected onModelCreating(): void {
    console.log('Configuring models...');
  }
}