import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GamesService } from './games/games.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const gamesService = app.get(GamesService);

  try {
    // Get all games
    const games = await gamesService.findAll();

    if (games.length === 0) {
      console.log('No games found in database');
      await app.close();
      return;
    }

    console.log(
      `Found ${games.length} games. Adding sample statistics to all games...`,
    );

    // Add sample statistics to each game
    for (const game of games) {
      console.log(`\nUpdating: ${game.homeTeam.name} vs ${game.awayTeam.name}`);

      await gamesService.updateStatistics({
        gameId: game.id,
        statistics: {
          possession: { home: 55, away: 45 },
          shots: { home: 12, away: 8 },
          shotsOnTarget: { home: 5, away: 3 },
          corners: { home: 6, away: 4 },
          fouls: { home: 10, away: 12 },
          yellowCards: { home: 2, away: 3 },
          redCards: { home: 0, away: 0 },
          offsides: { home: 2, away: 1 },
        },
        teamForm: {
          home: ['W', 'W', 'D', 'L', 'W'],
          away: ['L', 'W', 'W', 'D', 'L'],
        },
        headToHead: {
          homeWins: 3,
          draws: 2,
          awayWins: 1,
          lastMatches: [
            {
              date: '2024-08-15',
              homeTeam: game.homeTeam.name,
              awayTeam: game.awayTeam.name,
              score: '2-1',
            },
            {
              date: '2024-03-10',
              homeTeam: game.awayTeam.name,
              awayTeam: game.homeTeam.name,
              score: '1-1',
            },
            {
              date: '2023-11-20',
              homeTeam: game.homeTeam.name,
              awayTeam: game.awayTeam.name,
              score: '3-0',
            },
          ],
        },
      });

      console.log('✓ Statistics added successfully');
    }

    console.log('\n✅ All games updated with sample statistics!');
  } catch (error) {
    console.error('Error:', error.message);
  }

  await app.close();
}

bootstrap();
