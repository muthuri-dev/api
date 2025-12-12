import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesService } from './games.service';
import { GamesResolver } from './games.resolver';
import { ApiFootballService } from './api-football.service';
import { Game } from './entities/game.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Game])],
  providers: [GamesService, GamesResolver, ApiFootballService],
  exports: [GamesService, ApiFootballService],
})
export class GamesModule {}
