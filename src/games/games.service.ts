import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Game, GameStatus } from './entities/game.entity';
import { UpdateGameStatisticsInput } from './dto/update-game-statistics.input';
import { UpdateGameTipInput } from './dto/update-game-tip.input';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
  ) {}

  async findAll(): Promise<Game[]> {
    return this.gamesRepository.find();
  }

  async findById(id: string): Promise<Game> {
    const game = await this.gamesRepository.findOne({ where: { id } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    return game;
  }

  async findLive(): Promise<Game[]> {
    return this.gamesRepository.find({
      where: { status: GameStatus.LIVE },
      order: { startTime: 'ASC' },
    });
  }

  async findUpcoming(): Promise<Game[]> {
    const now = new Date();
    return this.gamesRepository.find({
      where: { status: GameStatus.SCHEDULED },
      order: { startTime: 'ASC' },
    });
  }

  async findCompleted(limit: number = 20): Promise<Game[]> {
    return this.gamesRepository.find({
      where: { status: GameStatus.COMPLETED },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async findBySport(sport: string, status?: GameStatus): Promise<Game[]> {
    const where: any = { sport };
    if (status) {
      where.status = status;
    }
    return this.gamesRepository.find({
      where,
      order: { startTime: 'ASC' },
    });
  }

  async create(gameData: Partial<Game>): Promise<Game> {
    const game = this.gamesRepository.create(gameData);
    return this.gamesRepository.save(game);
  }

  async update(id: string, updateData: Partial<Game>): Promise<Game> {
    await this.gamesRepository.update(id, updateData);
    return this.findById(id);
  }

  async incrementPredictions(gameId: string): Promise<void> {
    await this.gamesRepository.increment({ id: gameId }, 'totalPredictions', 1);
  }

  async updateStatistics(input: UpdateGameStatisticsInput): Promise<Game> {
    const game = await this.findById(input.gameId);

    const updateData: Partial<Game> = {};

    if (input.statistics) {
      updateData.statistics = input.statistics as any;
    }

    if (input.teamForm) {
      updateData.teamForm = input.teamForm as any;
    }

    if (input.headToHead) {
      updateData.headToHead = input.headToHead as any;
    }

    await this.gamesRepository.update(input.gameId, updateData);
    return this.findById(input.gameId);
  }

  async updateTip(input: UpdateGameTipInput): Promise<Game> {
    const game = await this.findById(input.gameId);

    await this.gamesRepository.update(input.gameId, {
      isFree: input.isFree,
      tipText: input.tipText || null,
      tipConfidence: input.tipConfidence || null,
      tipOutcome: input.tipOutcome || null,
    });

    return this.findById(input.gameId);
  }

  async removeTip(gameId: string): Promise<Game> {
    const game = await this.findById(gameId);

    await this.gamesRepository.update(gameId, {
      isFree: false,
      tipText: null,
      tipConfidence: null,
      tipOutcome: null,
    });

    return this.findById(gameId);
  }

  async findWithFreeTips(): Promise<Game[]> {
    return this.gamesRepository.find({
      where: { isFree: true },
      order: { startTime: 'ASC' },
    });
  }
}
