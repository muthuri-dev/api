import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameStatus } from './entities/game.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';

@Injectable()
export class ApiFootballService {
  private readonly logger = new Logger(ApiFootballService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://v3.football.api-sports.io';

  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
  ) {
    this.apiKey = process.env.API_FOOTBALL_KEY || '';
    if (!this.apiKey) {
      this.logger.warn(
        'API_FOOTBALL_KEY not set - API-Football service disabled',
      );
    } else {
      this.logger.log(
        '✅ API-Football service initialized - Will sync fixtures every hour',
      );
      // Trigger initial sync after 10 seconds
      setTimeout(() => this.syncFixtures(), 10000);
    }
  }

  private async makeRequest(endpoint: string, params: any = {}) {
    if (!this.apiKey) {
      this.logger.warn('API-Football key not configured');
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: {
          'x-apisports-key': this.apiKey,
        },
        params,
      });

      // Log API errors
      if (
        response.data?.errors &&
        Object.keys(response.data.errors).length > 0
      ) {
        this.logger.error(
          `API-Football errors: ${JSON.stringify(response.data.errors)}`,
        );
      }

      return response.data;
    } catch (error) {
      this.logger.error(`API-Football request failed: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(
          `Response data: ${JSON.stringify(error.response.data)}`,
        );
      }
      return null;
    }
  }

  // Kenya Premier League ID: 288
  // Major European leagues: 39 (Premier League), 140 (La Liga), 135 (Serie A), 78 (Bundesliga), 61 (Ligue 1)
  private readonly leagueIds = [
    288, // Kenya Premier League
    39, // Premier League
    140, // La Liga
    135, // Serie A
    78, // Bundesliga
    61, // Ligue 1
    2, // UEFA Champions League
  ];

  @Cron(CronExpression.EVERY_HOUR)
  async syncFixtures() {
    if (!this.apiKey) {
      return;
    }

    this.logger.log(
      '🔄 Starting API-Football fixtures sync (2023 season - Free plan limitation)',
    );

    for (const leagueId of this.leagueIds) {
      await this.syncLeagueFixtures(leagueId, '', '');
    }

    this.logger.log('✅ API-Football fixtures sync completed');
  }

  private async syncLeagueFixtures(
    leagueId: number,
    dateFrom: string,
    dateTo: string,
  ) {
    // Free plan only has access to 2021-2023 seasons
    // Using 2023 for demo purposes
    const season = 2023;

    this.logger.log(`Fetching league ${leagueId} season ${season} fixtures...`);

    const data = await this.makeRequest('/fixtures', {
      league: leagueId,
      season: season,
      timezone: 'Africa/Nairobi',
    });

    if (!data?.response) {
      this.logger.warn(
        `No data received for league ${leagueId} season ${season}`,
      );
      return;
    }

    if (data.response.length === 0) {
      this.logger.warn(
        `No fixtures found for league ${leagueId} season ${season}`,
      );
      return;
    }

    // Limit to first 50 fixtures to avoid overwhelming the database with old data
    const fixturesToSync = data.response.slice(0, 50);

    for (const fixture of fixturesToSync) {
      await this.processFixture(fixture);
    }

    this.logger.log(
      `✅ Synced ${fixturesToSync.length} fixtures for league ${leagueId} (${data.response.length} total available)`,
    );
  }

  private async processFixture(fixture: any) {
    const externalId = `api-football-${fixture.fixture.id}`;

    // Check if game already exists
    let game = await this.gamesRepository.findOne({
      where: { externalId },
    });

    const status = this.mapStatus(fixture.fixture.status.short);
    const gameData = {
      sport: 'Football',
      league: fixture.league.name,
      homeTeam: {
        name: fixture.teams.home.name,
        logo: fixture.teams.home.logo,
        score: fixture.goals.home,
      },
      awayTeam: {
        name: fixture.teams.away.name,
        logo: fixture.teams.away.logo,
        score: fixture.goals.away,
      },
      startTime: new Date(fixture.fixture.date),
      status,
      venue: fixture.fixture.venue?.name || null,
      externalId,
      // API-Football provides odds via separate endpoint - can be added later
      homeOdds: null,
      awayOdds: null,
      drawOdds: null,
    };

    if (game) {
      // Update existing game
      await this.gamesRepository.update(game.id, gameData);
    } else {
      // Create new game
      game = this.gamesRepository.create(gameData);
      await this.gamesRepository.save(game);
    }
  }

  private mapStatus(apiStatus: string): GameStatus {
    const statusMap: { [key: string]: GameStatus } = {
      TBD: GameStatus.SCHEDULED,
      NS: GameStatus.SCHEDULED,
      '1H': GameStatus.LIVE,
      HT: GameStatus.LIVE,
      '2H': GameStatus.LIVE,
      ET: GameStatus.LIVE,
      P: GameStatus.LIVE,
      FT: GameStatus.COMPLETED,
      AET: GameStatus.COMPLETED,
      PEN: GameStatus.COMPLETED,
      PST: GameStatus.POSTPONED,
      CANC: GameStatus.CANCELLED,
      ABD: GameStatus.CANCELLED,
      AWD: GameStatus.COMPLETED,
      WO: GameStatus.COMPLETED,
    };

    return statusMap[apiStatus] || GameStatus.SCHEDULED;
  }

  // Fetch odds for a specific fixture
  async fetchOddsForFixture(fixtureId: number) {
    const data = await this.makeRequest('/odds', {
      fixture: fixtureId,
      bookmaker: 1, // Bet365
    });

    if (!data?.response?.[0]?.bookmakers?.[0]?.bets) {
      return null;
    }

    const matchWinnerBet = data.response[0].bookmakers[0].bets.find(
      (bet: any) => bet.name === 'Match Winner',
    );

    if (!matchWinnerBet?.values) {
      return null;
    }

    return {
      homeOdds: parseFloat(
        matchWinnerBet.values.find((v: any) => v.value === 'Home')?.odd || '0',
      ),
      drawOdds: parseFloat(
        matchWinnerBet.values.find((v: any) => v.value === 'Draw')?.odd || '0',
      ),
      awayOdds: parseFloat(
        matchWinnerBet.values.find((v: any) => v.value === 'Away')?.odd || '0',
      ),
    };
  }

  // Manual sync method for testing/admin
  async manualSync(): Promise<{ success: boolean; message: string }> {
    if (!this.apiKey) {
      return { success: false, message: 'API key not configured' };
    }

    try {
      await this.syncFixtures();
      return { success: true, message: 'Sync completed successfully' };
    } catch (error) {
      this.logger.error(`Manual sync failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }
}
