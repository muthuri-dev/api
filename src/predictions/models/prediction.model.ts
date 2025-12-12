import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { User } from '../../users/models/user.model';
import { Game } from '../../games/models/game.model';

@ObjectType()
export class Prediction {
  @Field(() => ID)
  id: string;

  @Field(() => User)
  user: User;

  @Field(() => Game)
  game: Game;

  @Field()
  predictedOutcome: string;

  @Field(() => Float)
  confidence: number;

  @Field(() => Float, { nullable: true })
  amount?: number;

  @Field()
  status: string;

  @Field({ nullable: true })
  result?: string;

  @Field(() => Float, { nullable: true })
  payout?: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
