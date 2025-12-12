import { DataSource } from 'typeorm';
import { Game, GameStatus } from '../games/entities/game.entity';

// This script adds a test tip to the first upcoming game
async function addTestTip() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'jane_db',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  });

  await dataSource.initialize();
  console.log('Database connected');

  const gameRepository = dataSource.getRepository(Game);

  // Find the first upcoming game
  const game = await gameRepository.findOne({
    where: { status: GameStatus.SCHEDULED },
    order: { startTime: 'ASC' },
  });

  if (!game) {
    console.log('No upcoming games found');
    await dataSource.destroy();
    return;
  }

  console.log(`Found game: ${game.homeTeam.name} vs ${game.awayTeam.name}`);

  // Add a test tip
  await gameRepository.update(game.id, {
    isFree: true,
    tipText: `Strong prediction for this match. ${game.homeTeam.name} has been in excellent form recently with solid defensive performance. Expected outcome based on recent statistics and head-to-head records.`,
    tipConfidence: 78,
    tipOutcome: 'home_win',
  });

  console.log('✅ Test tip added successfully!');
  console.log('Game ID:', game.id);
  console.log('Tip:', {
    isFree: true,
    tipOutcome: 'home_win',
    tipConfidence: 78,
  });

  await dataSource.destroy();
}

addTestTip().catch(console.error);
