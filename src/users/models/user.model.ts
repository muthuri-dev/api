import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { Prediction } from '../../predictions/models/prediction.model';
import { Payment } from '../../payments/models/payment.model';

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  fullName?: string;

  @Field()
  phone: string;

  @Field()
  emailVerified: boolean;

  @Field()
  phoneVerified: boolean;

  @Field({ nullable: true })
  avatar?: string;

  @Field()
  role: string;

  @Field()
  smsNotifications: boolean;

  @Field()
  emailNotifications: boolean;

  @Field(() => Float)
  balance: number;

  @Field(() => Int)
  totalPredictions: number;

  @Field(() => Int)
  correctPredictions: number;

  @Field(() => Float)
  winRate: number;

  @Field({ nullable: true })
  subscriptionPlan?: string;

  @Field()
  subscriptionStatus: string;

  @Field({ nullable: true })
  subscriptionStartDate?: Date;

  @Field({ nullable: true })
  subscriptionEndDate?: Date;

  @Field({ nullable: true })
  referralCode?: string;

  @Field({ nullable: true })
  referredBy?: string;

  @Field(() => Int)
  referralPoints: number;

  @Field(() => Int)
  totalReferrals: number;

  @Field(() => Float)
  referralValue: number; // Computed: referralPoints * 10

  @Field(() => [Prediction], { nullable: true })
  predictions?: Prediction[];

  @Field(() => [Payment], { nullable: true })
  payments?: Payment[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
