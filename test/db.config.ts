import { DbConfig } from '../src/config/dbConfig';
import { Department } from './models/department.model';
import { Product } from './models/product.model';
import { User } from './models/user.model';
import { Order } from './models/order.model';
import { OrderItem } from './models/orderItem.model';
import { Profile } from './models/profile.model';
import { Category } from './models/category.model';
import { Tag } from './models/tag.model';
import { ProductTag } from './models/productTag.model';

export const dbConfig: DbConfig = {
  dbName: 'myapp',
  connectionString: 'fast://./data/myapp',
  
  preload: ['users', 'products', 'departments', 'orders'],
  
  entities: {
    users: {
      type: User,
      tableName: 'users'
    },
    products: {
      type: Product,
      tableName: 'products'
    },
    departments: {
      type: Department,
      tableName: 'departments'
    },
    orders: {
      type: Order,
      tableName: 'orders'
    },
    orderItems: {
      type: OrderItem,
      tableName: 'orderItems'
    },
    profiles: {
      type: Profile,
      tableName: 'profiles'
    },
    categories: {
      type: Category,
      tableName: 'categories'
    },
    tags: {
      type: Tag,
      tableName: 'tags'
    },
    productTags: {
      type: ProductTag,
      tableName: 'productTags'
    }
  }
};