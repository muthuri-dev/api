import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class DashboardStats {
  @Field(() => Int)
  totalUsers: number;

  @Field(() => Int)
  activeUsers: number;

  @Field(() => Int)
  totalGames: number;

  @Field(() => Int)
  liveGames: number;

  @Field(() => Int)
  totalPredictions: number;

  @Field(() => Int)
  todayPredictions: number;

  @Field(() => Float)
  totalRevenue: number;

  @Field(() => Float)
  totalPayouts: number;
}
