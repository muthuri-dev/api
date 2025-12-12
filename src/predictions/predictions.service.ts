import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prediction, PredictionStatus } from './entities/prediction.entity';
import { CreatePredictionInput } from './dto/create-prediction.input';
import { GamesService } from '../games/games.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class PredictionsService {
  constructor(
    @InjectRepository(Prediction)
    private predictionsRepository: Repository<Prediction>,
    private gamesService: GamesService,
    private usersService: UsersService,
  ) {}

  async create(
    userId: string,
    createPredictionInput: CreatePredictionInput,
  ): Promise<Prediction> {
    const game = await this.gamesService.findById(createPredictionInput.gameId);

    if (new Date(game.startTime) < new Date()) {
      throw new BadRequestException(
        'Cannot predict on games that have already started',
      );
    }

    const prediction = this.predictionsRepository.create({
      userId,
      gameId: createPredictionInput.gameId,
      predictedOutcome: createPredictionInput.predictedOutcome as any,
      confidence: createPredictionInput.confidence,
      amount: createPredictionInput.amount,
    });

    const saved = await this.predictionsRepository.save(prediction);
    await this.gamesService.incrementPredictions(createPredictionInput.gameId);

    return saved;
  }

  async findByUser(userId: string): Promise<Prediction[]> {
    return this.predictionsRepository.find({
      where: { userId },
      relations: ['game'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByGame(gameId: string): Promise<Prediction[]> {
    return this.predictionsRepository.find({
      where: { gameId },
      relations: ['user'],
    });
  }

  async getUserStats(userId: string): Promise<any> {
    const predictions = await this.findByUser(userId);
    const user = await this.usersService.findById(userId);

    const stats = {
      totalPredictions: predictions.length,
      correctPredictions: predictions.filter(
        (p) => p.status === PredictionStatus.WON,
      ).length,
      incorrectPredictions: predictions.filter(
        (p) => p.status === PredictionStatus.LOST,
      ).length,
      pendingPredictions: predictions.filter(
        (p) => p.status === PredictionStatus.PENDING,
      ).length,
      winRate:
        user.totalPredictions > 0
          ? (user.correctPredictions / user.totalPredictions) * 100
          : 0,
      totalWinnings: predictions
        .filter((p) => p.status === PredictionStatus.WON)
        .reduce((sum, p) => sum + Number(p.payout || 0), 0),
      totalLosses: predictions
        .filter((p) => p.status === PredictionStatus.LOST)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0),
      netProfit: 0,
    };

    stats.netProfit = stats.totalWinnings - stats.totalLosses;

    return stats;
  }

  async getLeaderboard(limit: number = 10): Promise<any[]> {
    const users = await this.usersService.findAll();

    return users
      .map((user) => ({
        user,
        winRate:
          user.totalPredictions > 0
            ? (user.correctPredictions / user.totalPredictions) * 100
            : 0,
      }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, limit);
  }
}
