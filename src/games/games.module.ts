import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesService } from './games.service';
import { GamesResolver } from './games.resolver';
import { FootballScraperService } from './football-scraper.service';
import { Game } from './entities/game.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Game])],
  providers: [GamesService, GamesResolver, FootballScraperService],
  exports: [GamesService, FootballScraperService],
})
export class GamesModule {}
