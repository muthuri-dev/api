import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: [
      configService.get('FRONTEND_URL') || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite dev server.
    ],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get('PORT') || 3000;
  await app.listen(port);

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Jane on the Game API - Ready!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Local:       http://localhost:${port}`);
  console.log(`🎮 GraphQL:     http://localhost:${port}/graphql`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('💳 Payment Gateway: Paystack (M-Pesa, Cards, Banks)');
  console.log('');
  console.log('📖 Ready to test! Open GraphQL Playground');
  console.log('');
}
bootstrap();
