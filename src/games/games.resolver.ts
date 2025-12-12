import { Resolver, Query, Args, Subscription, Mutation } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { UseGuards, SetMetadata } from '@nestjs/common';
import { GamesService } from './games.service';
import { ApiFootballService } from './api-football.service';
import { Game } from './models/game.model';
import { SyncResult } from './models/sync-result.model';
import { GameStatus } from './entities/game.entity';
import { UpdateGameStatisticsInput } from './dto/update-game-statistics.input';
import { UpdateGameTipInput } from './dto/update-game-tip.input';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { GqlRolesGuard } from '../common/guards/gql-roles.guard';
import { UserRole } from '../users/entities/user.entity';

const pubSub = new PubSub();

@Resolver(() => Game)
export class GamesResolver {
  constructor(
    private readonly gamesService: GamesService,
    private readonly apiFootballService: ApiFootballService,
  ) {}

  @Query(() => [Game], { name: 'liveGames' })
  async getLiveGames() {
    return this.gamesService.findLive();
  }

  @Query(() => [Game], { name: 'upcomingGames' })
  async getUpcomingGames() {
    return this.gamesService.findUpcoming();
  }

  @Query(() => [Game], { name: 'completedGames' })
  async getCompletedGames(
    @Args('limit', { type: () => Number, defaultValue: 20 }) limit: number,
  ) {
    return this.gamesService.findCompleted(limit);
  }

  @Query(() => Game, { name: 'game' })
  async getGame(@Args('id') id: string) {
    return this.gamesService.findById(id);
  }

  @Query(() => [Game], { name: 'gamesBySport' })
  async getGamesBySport(
    @Args('sport') sport: string,
    @Args('status', { nullable: true }) status?: GameStatus,
  ) {
    return this.gamesService.findBySport(sport, status);
  }

  @Query(() => [Game], { name: 'allGames' })
  async getAllGames() {
    return this.gamesService.findAll();
  }

  @Subscription(() => Game, {
    name: 'gameUpdated',
    filter: (payload, variables) => {
      return !variables.gameId || payload.gameUpdated.id === variables.gameId;
    },
  })
  gameUpdated(@Args('gameId', { nullable: true }) gameId?: string) {
    return pubSub.asyncIterator('gameUpdated');
  }

  @Subscription(() => Game, {
    name: 'gameStatusChanged',
  })
  gameStatusChanged() {
    return pubSub.asyncIterator('gameStatusChanged');
  }

  @Mutation(() => Game, { name: 'updateGameStatistics' })
  @UseGuards(GqlAuthGuard, GqlRolesGuard)
  @SetMetadata('roles', [UserRole.ADMIN])
  async updateGameStatistics(@Args('input') input: UpdateGameStatisticsInput) {
    return this.gamesService.updateStatistics(input);
  }

  @Mutation(() => Game, { name: 'updateGameTip' })
  @UseGuards(GqlAuthGuard, GqlRolesGuard)
  @SetMetadata('roles', [UserRole.ADMIN])
  async updateGameTip(@Args('input') input: UpdateGameTipInput) {
    return this.gamesService.updateTip(input);
  }

  @Mutation(() => Game, { name: 'removeGameTip' })
  @UseGuards(GqlAuthGuard, GqlRolesGuard)
  @SetMetadata('roles', [UserRole.ADMIN])
  async removeGameTip(@Args('gameId') gameId: string) {
    return this.gamesService.removeTip(gameId);
  }

  @Query(() => [Game], { name: 'gamesWithFreeTips' })
  async getGamesWithFreeTips() {
    return this.gamesService.findWithFreeTips();
  }

  @Mutation(() => SyncResult, { name: 'syncApiFootballFixtures' })
  @UseGuards(GqlAuthGuard, GqlRolesGuard)
  @SetMetadata('roles', [UserRole.ADMIN])
  async syncApiFootballFixtures() {
    return this.apiFootballService.manualSync();
  }
}
