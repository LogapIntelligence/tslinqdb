import 'reflect-metadata';
import { Column, ForeignKey, PrimaryKey, Table } from '../../src/decorators/column';
import { User } from './user.model';

@Table('profiles')
export class Profile {
  @PrimaryKey()
  @Column({ type: 'number' })
  id!: number;

  @Column({ type: 'string', nullable: true })
  bio?: string;

  @Column({ type: 'string', nullable: true })
  avatarUrl?: string;

  @Column({ type: 'string', nullable: true })
  phoneNumber?: string;

  @Column({ type: 'date' })
  birthDate!: Date;

  @ForeignKey(() => User)
  userId!: number;

  user?: User;
}