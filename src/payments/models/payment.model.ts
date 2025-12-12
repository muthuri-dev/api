import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { User } from '../../users/models/user.model';

@ObjectType()
export class Payment {
  @Field(() => ID)
  id: string;

  @Field(() => User)
  user: User;

  @Field(() => Float)
  amount: number;

  @Field()
  type: string;

  @Field()
  status: string;

  @Field()
  method: string;

  @Field({ nullable: true })
  transactionId?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  invoiceNumber?: string;

  @Field({ nullable: true })
  subscriptionPlan?: string;

  @Field({ nullable: true })
  subscriptionDurationMonths?: number;

  @Field({ nullable: true })
  reference?: string;

  @Field({ defaultValue: 'KES' })
  currency: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
