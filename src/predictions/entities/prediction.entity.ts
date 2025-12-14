import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { User } from '../../users/entities/user.entity';
import type { Game } from '../../games/entities/game.entity';

export enum PredictionStatus {
  PENDING = 'pending',
  WON = 'won',
  LOST = 'lost',
  CANCELLED = 'cancelled',
}

export enum PredictionOutcome {
  HOME_WIN = 'home_win',
  AWAY_WIN = 'away_win',
  DRAW = 'draw',
}

@Entity('predictions')
export class Prediction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne('User', 'predictions')
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne('Game', 'predictions')
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @Column({ type: 'uuid' })
  gameId: string;

  @Column({
    type: 'enum',
    enum: PredictionOutcome,
  })
  predictedOutcome: PredictionOutcome;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  confidence: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number | null;

  @Column({
    type: 'enum',
    enum: PredictionStatus,
    default: PredictionStatus.PENDING,
  })
  status: PredictionStatus;

  @Column({ type: 'varchar', nullable: true })
  result: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  payout: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
