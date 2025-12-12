import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class PredictionStats {
  @Field(() => Int)
  totalPredictions: number;

  @Field(() => Int)
  correctPredictions: number;

  @Field(() => Int)
  incorrectPredictions: number;

  @Field(() => Int)
  pendingPredictions: number;

  @Field(() => Float)
  winRate: number;

  @Field(() => Float)
  totalWinnings: number;

  @Field(() => Float)
  totalLosses: number;

  @Field(() => Float)
  netProfit: number;
}
