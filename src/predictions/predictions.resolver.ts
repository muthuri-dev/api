import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { Prediction } from './models/prediction.model';
import { CreatePredictionInput } from './dto/create-prediction.input';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PredictionStats } from './models/prediction-stats.model';

@Resolver(() => Prediction)
export class PredictionsResolver {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Mutation(() => Prediction)
  @UseGuards(GqlAuthGuard)
  async createPrediction(
    @CurrentUser() user: any,
    @Args('input') createPredictionInput: CreatePredictionInput,
  ) {
    return this.predictionsService.create(user.id, createPredictionInput);
  }

  @Query(() => [Prediction], { name: 'myPredictions' })
  @UseGuards(GqlAuthGuard)
  async getMyPredictions(@CurrentUser() user: any) {
    return this.predictionsService.findByUser(user.id);
  }

  @Query(() => [Prediction], { name: 'gamePredictions' })
  async getGamePredictions(@Args('gameId') gameId: string) {
    return this.predictionsService.findByGame(gameId);
  }

  @Query(() => PredictionStats, { name: 'myPredictionStats' })
  @UseGuards(GqlAuthGuard)
  async getMyStats(@CurrentUser() user: any) {
    return this.predictionsService.getUserStats(user.id);
  }

  @Query(() => [Prediction], { name: 'leaderboard' })
  async getLeaderboard(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ) {
    return this.predictionsService.getLeaderboard(limit);
  }
}
