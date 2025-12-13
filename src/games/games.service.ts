import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Game, GameStatus } from './entities/game.entity';
import { UpdateGameStatisticsInput } from './dto/update-game-statistics.input';
import { UpdateGameTipInput } from './dto/update-game-tip.input';
import axios from 'axios';

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

  async fetchH2HForGame(gameId: string): Promise<Game> {
    const game = await this.findById(gameId);
    
    // Try to extract SofaScore event ID from externalId
    if (game.externalId?.startsWith('sofascore-')) {
      const eventId = parseInt(game.externalId.replace('sofascore-', ''));
      
      try {
        const response = await axios.get(
          `https://api.sofascore.com/api/v1/event/${eventId}/h2h/events`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json',
            },
            timeout: 10000,
          }
        );

        if (response.data?.events) {
          const h2hMatches = response.data.events.slice(0, 5);
          
          let homeWins = 0;
          let draws = 0;
          let awayWins = 0;
          const lastMatches: any[] = [];

          const homeTeamName = game.homeTeam.name;

          for (const match of h2hMatches) {
            const homeScore = match.homeScore?.current || 0;
            const awayScore = match.awayScore?.current || 0;
            const matchDate = new Date(match.startTimestamp * 1000);

            const matchHomeTeam = match.homeTeam?.name;
            const matchAwayTeam = match.awayTeam?.name;

            const ourTeamWasHome = matchHomeTeam === homeTeamName;
            const ourTeamWasAway = matchAwayTeam === homeTeamName;

            if (homeScore === awayScore) {
              draws++;
            } else if (ourTeamWasHome && homeScore > awayScore) {
              homeWins++;
            } else if (ourTeamWasAway && awayScore > homeScore) {
              homeWins++;
            } else {
              awayWins++;
            }

            lastMatches.push({
              date: matchDate.toLocaleDateString(),
              homeTeam: matchHomeTeam,
              awayTeam: matchAwayTeam,
              score: `${homeScore}-${awayScore}`,
            });
          }

          await this.gamesRepository.update(gameId, {
            headToHead: {
              homeWins,
              draws,
              awayWins,
              lastMatches,
            },
          });

          return this.findById(gameId);
        }
      } catch (error) {
        throw new Error(`Failed to fetch H2H: ${error.message}`);
      }
    }

    throw new Error('Game does not have a SofaScore ID');
  }
}
