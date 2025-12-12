import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PredictionsService } from './predictions.service';
import { PredictionsResolver } from './predictions.resolver';
import { Prediction } from './entities/prediction.entity';
import { GamesModule } from '../games/games.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Prediction]), GamesModule, UsersModule],
  providers: [PredictionsService, PredictionsResolver],
  exports: [PredictionsService],
})
export class PredictionsModule {}
