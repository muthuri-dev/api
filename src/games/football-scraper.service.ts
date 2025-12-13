import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameStatus } from './entities/game.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScrapedMatch {
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  league: string;
  startTime: Date;
  status: GameStatus;
}

@Injectable()
export class FootballScraperService {
  private readonly logger = new Logger(FootballScraperService.name);

  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
  ) {
    this.logger.log('⚽ Football Scraper Service initialized');
    // Initial sync after 10 seconds
    setTimeout(() => this.syncAllSources(), 10000);
  }

  // Run every 2 hours to scrape fresh data
  @Cron(CronExpression.EVERY_2_HOURS)
  async syncAllSources() {
    this.logger.log('🔄 Starting football data scraping from free sources...');

    try {
      // Free sources - no auth needed!
      await this.scrapeSofaScore(); // Best for African leagues
      await this.scrapeTheFreeSportsAPI(); // TheSportsDB
      await this.scrapeFootballDataOrg(); // European leagues
    } catch (error) {
      this.logger.error(`Scraping failed: ${error.message}`);
    }

    this.logger.log('✅ Football scraping completed');
  }

  /**
   * SofaScore FREE API - Excellent for African leagues, no auth needed!
   */
  private async scrapeSofaScore() {
    try {
      this.logger.log('⚽ Fetching from SofaScore (Free API - African leagues)...');

      // SofaScore event IDs for leagues we care about
      const tournaments = [
        { id: 17, name: 'Premier League' },
        { id: 8, name: 'La Liga' },
        { id: 35, name: 'Bundesliga' },
        { id: 23, name: 'Serie A' },
        { id: 34, name: 'Ligue 1' },
        { id: 7, name: 'UEFA Champions League' },
        { id: 679, name: 'Kenyan Premier League' },
        { id: 288, name: 'South African Premier Division' },
        { id: 628, name: 'Egyptian Premier League' },
        { id: 921, name: 'Nigerian Professional League' },
        { id: 16, name: 'CAF Champions League' },
      ];

      let totalSaved = 0;

      for (const tournament of tournaments) {
        try {
          // Get today's date
          const today = new Date();
          const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

          const response = await axios.get(
            `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${dateStr}`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
              },
              timeout: 10000,
            }
          );

          if (response.data?.events) {
            // Filter events for this tournament
            const tournamentEvents = response.data.events.filter(
              (e: any) => e.tournament?.id === tournament.id
            );

            for (const event of tournamentEvents) {
              if (await this.saveSofaScoreEvent(event, tournament.name)) {
                totalSaved++;
              }
            }

            if (tournamentEvents.length > 0) {
              this.logger.log(`✅ ${tournament.name}: ${tournamentEvents.length} matches`);
            }
          }

          // Small delay to be respectful
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e) {
          this.logger.debug(`${tournament.name} failed: ${e.message}`);
        }
      }

      if (totalSaved > 0) {
        this.logger.log(`✅ SofaScore: Total ${totalSaved} matches saved`);
      }
    } catch (error) {
      this.logger.warn(`SofaScore failed: ${error.message}`);
    }
  }

  private async saveSofaScoreEvent(event: any, leagueName: string): Promise<boolean> {
    try {
      const externalId = `sofascore-${event.id}`;

      // Check if already exists
      const existing = await this.gamesRepository.findOne({
        where: { externalId },
      });

      if (existing) {
        return false; // Already saved
      }

      // Parse start time
      const startTime = new Date(event.startTimestamp * 1000);

      // Determine status
      let status = GameStatus.SCHEDULED;
      if (event.status?.type === 'inprogress') {
        status = GameStatus.LIVE;
      } else if (event.status?.type === 'finished') {
        status = GameStatus.COMPLETED;
      }

      const gameData: any = {
        sport: 'Football',
        league: leagueName,
        homeTeam: {
          name: event.homeTeam?.name || 'TBD',
          logo: event.homeTeam?.id 
            ? `https://api.sofascore.com/api/v1/team/${event.homeTeam.id}/image`
            : undefined,
          score: event.homeScore?.current,
        },
        awayTeam: {
          name: event.awayTeam?.name || 'TBD',
          logo: event.awayTeam?.id
            ? `https://api.sofascore.com/api/v1/team/${event.awayTeam.id}/image`
            : undefined,
          score: event.awayScore?.current,
        },
        startTime,
        status,
        venue: event.venue?.stadium?.name,
        externalId,
      };

      // Save the game first
      const savedGame = await this.gamesRepository.save(gameData);

      // Fetch H2H data in background (don't wait for it)
      if (event.id) {
        this.fetchH2HData(savedGame.id, event.id).catch(e => 
          this.logger.debug(`H2H fetch failed for event ${event.id}: ${e.message}`)
        );
      }

      return true;
    } catch (e) {
      this.logger.debug(`Failed to save SofaScore event: ${e.message}`);
      return false;
    }
  }

  /**
   * Football-Data.org FREE API - Works without registration for limited data
   */
  private async scrapeFootballDataOrg() {
    try {
      this.logger.log('📡 Fetching from Football-Data.org (Free tier)...');

      // Only fetch a few competitions to avoid timeout
      const competitions = ['PL', 'CL'];

      let totalSaved = 0;

      for (const code of competitions) {
        try {
          const response = await axios.get(
            `https://api.football-data.org/v4/competitions/${code}/matches`,
            {
              params: { 
                status: 'SCHEDULED,TIMED',
              },
              timeout: 15000,
            }
          );

          if (response.data?.matches) {
            // Limit to 10 matches per competition
            const matches = response.data.matches.slice(0, 10);
            for (const match of matches) {
              if (await this.saveFootballDataMatch(match)) {
                totalSaved++;
              }
            }
          }

          this.logger.debug(`${code}: Processed ${response.data?.matches?.length || 0} matches`);
          
          // Delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (e) {
          this.logger.debug(`${code} failed: ${e.message}`);
        }
      }

      if (totalSaved > 0) {
        this.logger.log(`✅ Football-Data.org: ${totalSaved} matches saved`);
      }
    } catch (error) {
      this.logger.warn(`Football-Data.org failed: ${error.message}`);
    }
  }

  private async saveFootballDataMatch(match: any): Promise<boolean> {
    try {
      const externalId = `fd-${match.id}`;

      const statusMap: any = {
        'SCHEDULED': GameStatus.SCHEDULED,
        'TIMED': GameStatus.SCHEDULED,
        'IN_PLAY': GameStatus.LIVE,
        'PAUSED': GameStatus.LIVE,
        'FINISHED': GameStatus.COMPLETED,
        'POSTPONED': GameStatus.POSTPONED,
        'CANCELLED': GameStatus.CANCELLED,
      };

      const gameData: any = {
        sport: 'Football',
        league: match.competition?.name || 'Football',
        homeTeam: {
          name: match.homeTeam?.name || match.homeTeam?.shortName || 'TBD',
          logo: match.homeTeam?.crest || undefined,
          score: match.score?.fullTime?.home !== null ? match.score.fullTime.home : undefined,
        },
        awayTeam: {
          name: match.awayTeam?.name || match.awayTeam?.shortName || 'TBD',
          logo: match.awayTeam?.crest || undefined,
          score: match.score?.fullTime?.away !== null ? match.score.fullTime.away : undefined,
        },
        startTime: new Date(match.utcDate),
        status: statusMap[match.status] || GameStatus.SCHEDULED,
        venue: match.venue || undefined,
        externalId,
        homeOdds: undefined,
        awayOdds: undefined,
        drawOdds: undefined,
      };

      const existing = await this.gamesRepository.findOne({ where: { externalId } });

      if (existing) {
        await this.gamesRepository.update(existing.id, gameData);
        return false;
      } else {
        const newGame = this.gamesRepository.create(gameData);
        await this.gamesRepository.save(newGame);
        this.logger.log(`✅ Saved: ${gameData.homeTeam.name} vs ${gameData.awayTeam.name}`);
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Use LiveScore API - Free public API
   */
  private async scrapeLiveScoreAPI() {
    try {
      this.logger.log('📡 Fetching from LiveScore API...');

      // LiveScore has a public API endpoint
      const response = await axios.get('https://livescore-api.com/api-client/scores/live.json', {
        params: { 
          key: 'demo',  // Demo key for testing
          secret: 'demo'
        },
        timeout: 10000,
      });

      let savedCount = 0;
      const matches = response.data?.data?.match || [];

      for (const match of matches) {
        try {
          if (match.federation !== 'FIFA') continue; // Only football

          const externalId = `livescore-${match.id}`;
          const startTime = new Date(match.time || Date.now());

          const gameData: any = {
            sport: 'Football',
            league: match.competition_name || match.location || 'Football',
            homeTeam: {
              name: match.home_name || 'TBD',
              logo: match.home_logo || undefined,
              score: parseInt(match.score?.split(' - ')[0]) || undefined,
            },
            awayTeam: {
              name: match.away_name || 'TBD',
              logo: match.away_logo || undefined,
              score: parseInt(match.score?.split(' - ')[1]) || undefined,
            },
            startTime,
            status: match.status === 'LIVE' ? GameStatus.LIVE : 
                   match.status === 'FT' ? GameStatus.COMPLETED : 
                   GameStatus.SCHEDULED,
            venue: match.venue || undefined,
            externalId,
            homeOdds: undefined,
            awayOdds: undefined,
            drawOdds: undefined,
          };

          const existing = await this.gamesRepository.findOne({ where: { externalId } });
          
          if (existing) {
            await this.gamesRepository.update(existing.id, gameData);
          } else {
            const newGame = this.gamesRepository.create(gameData);
            await this.gamesRepository.save(newGame);
            savedCount++;
          }
        } catch (e) {
          this.logger.debug(`Skipped match: ${e.message}`);
        }
      }

      this.logger.log(`✅ LiveScore API: ${savedCount} new matches saved`);
    } catch (error) {
      this.logger.warn(`LiveScore API failed: ${error.message}`);
    }
  }

  /**
   * Betika API endpoint (primary method - more reliable than HTML scraping)
   */
  private async scrapeBetikaAPI() {
    try {
      this.logger.log('📡 Fetching from Betika API...');

      // Betika's public API endpoint for pre-match odds
      const response = await axios.get('https://api.betika.com/v1/uo/prematch', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        timeout: 15000,
      });

      let savedCount = 0;
      const data = response.data;

      // Try different possible response structures
      const events = data?.data?.events || data?.events || [];
      
      if (events.length === 0 && data?.sports) {
        // Alternative structure: sports -> leagues -> events
        for (const sport of data.sports) {
          if (sport.sport_id === 1 || sport.name?.toLowerCase().includes('football')) {
            for (const league of (sport.leagues || [])) {
              for (const event of (league.events || [])) {
                try {
                  await this.processBetikaEvent(event, league.league_name || 'Football');
                  savedCount++;
                } catch (e) {
                  this.logger.debug(`Skipped event: ${e.message}`);
                }
              }
            }
          }
        }
      } else {
        // Direct events array
        for (const event of events) {
          try {
            await this.processBetikaEvent(event);
            savedCount++;
          } catch (e) {
            this.logger.debug(`Skipped event: ${e.message}`);
          }
        }
      }

      this.logger.log(`✅ Betika API: ${savedCount} matches processed`);
      
      // If no matches found, try HTML scraping as fallback
      if (savedCount === 0) {
        this.logger.warn('No matches from Betika API, trying HTML scraping...');
        await this.scrapeBetika();
      }
    } catch (error) {
      this.logger.error(`Betika API failed: ${error.message}`);
      // Fallback to HTML scraping
      await this.scrapeBetika();
    }
  }

  private async processBetikaEvent(event: any, leagueName?: string) {
    const externalId = `betika-${event.event_id || event.id || event.match_id}`;
    
    // Parse start time
    let startTime = new Date();
    if (event.start_time || event.scheduled || event.match_time) {
      startTime = new Date(event.start_time || event.scheduled || event.match_time);
    }
    
    // Get team names - try multiple possible field names
    const homeTeam = event.home_team || event.home || event.home_name || event.team1 || 'TBD';
    const awayTeam = event.away_team || event.away || event.away_name || event.team2 || 'TBD';
    
    if (!homeTeam || !awayTeam || homeTeam === awayTeam) {
      throw new Error('Invalid team names');
    }

    // Get league name
    const league = leagueName || event.league_name || event.competition || event.category || 'Football';

    // Get scores if available
    const homeScore = event.home_score !== undefined ? parseInt(event.home_score) : undefined;
    const awayScore = event.away_score !== undefined ? parseInt(event.away_score) : undefined;

    // Get odds - try to find 1X2 market
    let homeOdds, drawOdds, awayOdds;
    
    if (event.odd_value) {
      homeOdds = parseFloat(event.odd_value);
    } else if (event.markets) {
      const matchWinner = event.markets.find((m: any) => 
        m.market_name?.includes('Winner') || 
        m.market_name?.includes('1X2') ||
        m.market_id === 1
      );
      
      if (matchWinner?.odds) {
        homeOdds = parseFloat(matchWinner.odds.find((o: any) => o.outcome === '1' || o.name === 'Home')?.odd_value || 0) || undefined;
        drawOdds = parseFloat(matchWinner.odds.find((o: any) => o.outcome === 'X' || o.name === 'Draw')?.odd_value || 0) || undefined;
        awayOdds = parseFloat(matchWinner.odds.find((o: any) => o.outcome === '2' || o.name === 'Away')?.odd_value || 0) || undefined;
      }
    }

    // Determine status
    let status = GameStatus.SCHEDULED;
    const statusStr = (event.status || event.match_status || '').toLowerCase();
    
    if (statusStr.includes('live') || statusStr.includes('playing') || event.is_live) {
      status = GameStatus.LIVE;
    } else if (statusStr.includes('finished') || statusStr.includes('ended')) {
      status = GameStatus.COMPLETED;
    }

    await this.saveMatch({
      externalId,
      homeTeam,
      awayTeam,
      league,
      homeScore,
      awayScore,
      startTime,
      status,
      homeOdds,
      drawOdds,
      awayOdds,
    });
  }

  /**
   * Scrape Betika.com HTML - Fallback method
   */
  private async scrapeBetika() {
    try {
      this.logger.log('📡 Scraping Betika.com HTML for football matches...');

      const response = await axios.get('https://www.betika.com/en-ke/sports-betting/football', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const matches: any[] = [];

      this.logger.log(`Betika HTML response size: ${response.data.length} bytes`);

      // Try multiple possible selectors for Betika's match elements
      const selectors = [
        '.prebet-match',
        '.bet-event',
        '[data-event-id]',
        '.match-item',
        '.event-row',
        '.bet-pick',
      ];

      for (const selector of selectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          this.logger.log(`Found ${elements.length} elements with selector: ${selector}`);
          break;
        }
      }

      // Log a sample of the HTML structure to debug
      const sampleHTML = $('body').html()?.substring(0, 1000);
      this.logger.debug(`Sample HTML: ${sampleHTML}`);

      this.logger.log(`✅ Betika HTML scraping attempted (fallback method)`);
    } catch (error) {
      this.logger.error(`Betika HTML scraping failed: ${error.message}`);
    }
  }

  private parseBetikaTime(timeText: string): Date {
    // Handle formats like "Today 15:00", "Tomorrow 18:30", "14/12 20:00"
    const now = new Date();
    
    if (timeText.toLowerCase().includes('today')) {
      const time = timeText.match(/(\d{1,2}):(\d{2})/);
      if (time) {
        now.setHours(parseInt(time[1]), parseInt(time[2]), 0, 0);
        return now;
      }
    } else if (timeText.toLowerCase().includes('tomorrow')) {
      const time = timeText.match(/(\d{1,2}):(\d{2})/);
      if (time) {
        now.setDate(now.getDate() + 1);
        now.setHours(parseInt(time[1]), parseInt(time[2]), 0, 0);
        return now;
      }
    } else {
      // Try parsing date format
      const dateMatch = timeText.match(/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
      if (dateMatch) {
        const [, day, month, hour, minute] = dateMatch;
        now.setMonth(parseInt(month) - 1);
        now.setDate(parseInt(day));
        now.setHours(parseInt(hour), parseInt(minute), 0, 0);
        return now;
      }
    }
    
    // Default to current time + 1 hour
    now.setHours(now.getHours() + 1);
    return now;
  }

  private async saveMatch(data: {
    externalId: string;
    homeTeam: string;
    awayTeam: string;
    league: string;
    homeScore?: number;
    awayScore?: number;
    startTime: Date;
    status: GameStatus;
    homeOdds?: number;
    drawOdds?: number;
    awayOdds?: number;
  }) {
    const gameData: any = {
      sport: 'Football',
      league: data.league,
      homeTeam: {
        name: data.homeTeam,
        logo: undefined,
        score: data.homeScore,
      },
      awayTeam: {
        name: data.awayTeam,
        logo: undefined,
        score: data.awayScore,
      },
      startTime: data.startTime,
      status: data.status,
      venue: undefined,
      externalId: data.externalId,
      homeOdds: data.homeOdds,
      awayOdds: data.awayOdds,
      drawOdds: data.drawOdds,
    };

    const existingGame = await this.gamesRepository.findOne({
      where: { externalId: data.externalId },
    });

    if (existingGame) {
      await this.gamesRepository.update(existingGame.id, gameData);
    } else {
      const newGame = this.gamesRepository.create(gameData);
      await this.gamesRepository.save(newGame);
    }
  }

  /**
   * The-Sports Free API - Backup source
   */
  private async scrapeTheFreeSportsAPI() {
    try {
      this.logger.log('📡 Fetching from TheSportsDB (Free API)...');

      // Get today's and next 7 days matches from multiple leagues
      const leagues = [
        { id: '4328', name: 'English Premier League' },
        { id: '4335', name: 'Spanish La Liga' },
        { id: '4331', name: 'German Bundesliga' },
        { id: '4332', name: 'Italian Serie A' },
        { id: '4334', name: 'French Ligue 1' },
        { id: '4480', name: 'UEFA Champions League' },
        { id: '4481', name: 'UEFA Europa League' },
        { id: '4396', name: 'CAF Champions League' },
        { id: '5126', name: 'Kenya Premier League' },
        { id: '4397', name: 'South African Premier Division' },
        { id: '4399', name: 'Egyptian Premier League' },
        { id: '4689', name: 'Nigerian Professional League' },
      ];

      let totalSaved = 0;

      for (const league of leagues) {
        // Try multiple endpoints to get matches
        const saved = await this.fetchLeagueMatches(league.id, league.name);
        totalSaved += saved;
      }

      this.logger.log(`✅ TheSportsDB: Total ${totalSaved} matches saved across all leagues`);
    } catch (error) {
      this.logger.error(`TheSportsDB scraping failed: ${error.message}`);
    }
  }

  private async fetchLeagueMatches(leagueId: string, leagueName: string): Promise<number> {
    try {
      let savedCount = 0;

      // Method 1: Get last 15 events from the league
      try {
        const response = await axios.get(
          `https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${leagueId}`,
          { timeout: 10000 }
        );

        this.logger.debug(`${leagueName} - Last events response: ${response.data?.events?.length || 0} events`);

        if (response.data?.events) {
          for (const event of response.data.events) {
            if (await this.saveSportsDBEvent(event, leagueName)) {
              savedCount++;
            }
          }
        }
      } catch (e) {
        this.logger.debug(`Last events failed for ${leagueName}: ${e.message}`);
      }

      // Method 2: Try getting by season (football seasons span years: 2024-2025)
      try {
        // Use the current active football season: 2024-2025
        // Football season runs from August to May, so we're in the 2024-2025 season
        const season = '2024-2025';
        
        const seasonResponse = await axios.get(
          `https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=${leagueId}&s=${season}`,
          { timeout: 10000 }
        );

        this.logger.debug(`${leagueName} - Season ${season} response: ${seasonResponse.data?.events?.length || 0} events`);

        if (seasonResponse.data?.events) {
          const now = new Date();
          const thirtyDaysAgo = new Date(now);
          thirtyDaysAgo.setDate(now.getDate() - 30);
          const ninetyDaysAhead = new Date(now);
          ninetyDaysAhead.setDate(now.getDate() + 90);
          
          for (const event of seasonResponse.data.events) {
            const eventDate = new Date(event.dateEvent);
            
            // Include matches from last 30 days and next 90 days, or any non-finished match
            if ((eventDate >= thirtyDaysAgo && eventDate <= ninetyDaysAhead) || 
                (event.strStatus !== 'Match Finished' && event.strStatus !== 'FT')) {
              if (await this.saveSportsDBEvent(event, leagueName)) {
                savedCount++;
              }
            }
          }
        }
      } catch (e) {
        this.logger.debug(`Season events failed for ${leagueName}: ${e.message}`);
      }

      if (savedCount > 0) {
        this.logger.log(`✅ ${leagueName}: ${savedCount} matches`);
      } else {
        this.logger.debug(`❌ ${leagueName}: No matches found`);
      }

      return savedCount;
    } catch (error) {
      this.logger.debug(`Failed to fetch ${leagueName}: ${error.message}`);
      return 0;
    }
  }

  private async saveSportsDBEvent(event: any, leagueName: string): Promise<boolean> {
    try {
      if (!event.strEvent || !event.dateEvent) return false;

      const homeTeam = event.strHomeTeam || 'TBD';
      const awayTeam = event.strAwayTeam || 'TBD';
      const externalId = `sportsdb-${event.idEvent}`;

      // Parse date properly
      let startTime: Date;
      
      // TheSportsDB format: "2025-12-15" for date and "15:00:00" for time
      const dateStr = event.dateEvent; // e.g., "2025-12-15"
      const timeStr = event.strTime || '15:00:00'; // e.g., "15:00:00"
      
      // Combine them properly
      const isoString = `${dateStr}T${timeStr}Z`; // ISO format
      startTime = new Date(isoString);
      
      // If invalid, try timestamp
      if (isNaN(startTime.getTime()) && event.strTimestamp) {
        startTime = new Date(parseInt(event.strTimestamp) * 1000);
      }
      
      // If still invalid, skip this event
      if (isNaN(startTime.getTime())) {
        this.logger.debug(`Invalid date for event ${event.idEvent}`);
        return false;
      }

      // Determine status
      let status = GameStatus.SCHEDULED;
      if (event.strStatus === 'Match Finished' || event.strStatus === 'FT') {
        status = GameStatus.COMPLETED;
      } else if (event.strPostponed === 'yes') {
        status = GameStatus.POSTPONED;
      } else if (event.strStatus?.includes('Half') || event.strStatus === 'LIVE') {
        status = GameStatus.LIVE;
      }

      const gameData: any = {
        sport: 'Football',
        league: leagueName,
        homeTeam: {
          name: homeTeam,
          logo: event.strHomeTeamBadge || undefined,
          score: event.intHomeScore ? parseInt(event.intHomeScore) : undefined,
        },
        awayTeam: {
          name: awayTeam,
          logo: event.strAwayTeamBadge || undefined,
          score: event.intAwayScore ? parseInt(event.intAwayScore) : undefined,
        },
        startTime,
        status,
        venue: event.strVenue || undefined,
        externalId,
        homeOdds: undefined,
        awayOdds: undefined,
        drawOdds: undefined,
      };

      const existingGame = await this.gamesRepository.findOne({
        where: { externalId },
      });

      if (existingGame) {
        await this.gamesRepository.update(existingGame.id, gameData);
        return false; // Not new
      } else {
        const newGame = this.gamesRepository.create(gameData);
        await this.gamesRepository.save(newGame);
        this.logger.log(`✅ Saved: ${homeTeam} vs ${awayTeam} (${startTime.toISOString()})`);
        return true; // New match
      }
    } catch (error) {
      this.logger.debug(`Failed to save event: ${error.message}`);
      return false;
    }
  }

  // Manual sync for testing
  async manualSync(): Promise<{ success: boolean; message: string }> {
    try {
      await this.syncAllSources();
      return { success: true, message: 'All sources scraped successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Fetch Head-to-Head data from SofaScore for a specific match
   */
  private async fetchH2HData(gameId: string, sofascoreEventId: number): Promise<void> {
    try {
      const response = await axios.get(
        `https://api.sofascore.com/api/v1/event/${sofascoreEventId}/h2h/events`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (!response.data?.events) {
        return;
      }

      const h2hMatches = response.data.events.slice(0, 5); // Last 5 meetings
      
      let homeWins = 0;
      let draws = 0;
      let awayWins = 0;
      const lastMatches: any[] = [];

      // Get the game to know which team is home/away
      const game = await this.gamesRepository.findOne({ where: { id: gameId } });
      if (!game) return;

      const homeTeamName = game.homeTeam.name;

      for (const match of h2hMatches) {
        const homeScore = match.homeScore?.current || 0;
        const awayScore = match.awayScore?.current || 0;
        const matchDate = new Date(match.startTimestamp * 1000);

        const matchHomeTeam = match.homeTeam?.name;
        const matchAwayTeam = match.awayTeam?.name;

        // Figure out which team our "home team" was in this match
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

      // Update game with H2H data
      await this.gamesRepository.update(gameId, {
        headToHead: {
          homeWins,
          draws,
          awayWins,
          lastMatches,
        },
      });

      this.logger.debug(`✅ H2H data saved for game ${gameId}`);
    } catch (error) {
      this.logger.debug(`H2H fetch failed: ${error.message}`);
    }
  }
}
