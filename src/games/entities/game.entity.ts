import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { Prediction } from '../../predictions/entities/prediction.entity';

export enum GameStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed',
}

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  sport: string;

  @Column({ type: 'varchar' })
  league: string;

  @Column({ type: 'jsonb' })
  homeTeam: {
    name: string;
    logo?: string;
    score?: number;
  };

  @Column({ type: 'jsonb' })
  awayTeam: {
    name: string;
    logo?: string;
    score?: number;
  };

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({
    type: 'enum',
    enum: GameStatus,
    default: GameStatus.SCHEDULED,
  })
  status: GameStatus;

  @Column({ type: 'varchar', nullable: true })
  venue: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  homeOdds: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  awayOdds: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  drawOdds: number | null;

  @Column({ type: 'varchar', nullable: true })
  externalId: string | null;

  @Column({ type: 'int', default: 0 })
  totalPredictions: number;

  // Free Tips System
  @Column({ type: 'boolean', default: false })
  isFree: boolean;

  @Column({ type: 'text', nullable: true })
  tipText: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  tipConfidence: number | null;

  @Column({ type: 'varchar', nullable: true })
  tipOutcome: string | null; // 'home_win', 'away_win', 'draw', 'over', 'under', etc.

  @Column({ type: 'jsonb', nullable: true })
  statistics: {
    possession?: { home: number; away: number };
    shots?: { home: number; away: number };
    shotsOnTarget?: { home: number; away: number };
    corners?: { home: number; away: number };
    fouls?: { home: number; away: number };
    yellowCards?: { home: number; away: number };
    redCards?: { home: number; away: number };
    offsides?: { home: number; away: number };
  } | null;

  @Column({ type: 'jsonb', nullable: true })
  teamForm: {
    home?: string[]; // e.g., ['W', 'D', 'L', 'W', 'W']
    away?: string[];
  } | null;

  @Column({ type: 'jsonb', nullable: true })
  headToHead: {
    homeWins?: number;
    draws?: number;
    awayWins?: number;
    lastMatches?: Array<{
      date: string;
      homeTeam: string;
      awayTeam: string;
      score: string;
    }>;
  } | null;

  @OneToMany('Prediction', 'game')
  predictions: Prediction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
