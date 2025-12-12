import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Prediction } from '../../predictions/entities/prediction.entity';
import { Payment } from '../../payments/entities/payment.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  password: string | null;

  @Column({ type: 'varchar', nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', nullable: true })
  fullName: string | null;

  @Column({ unique: true })
  phone: string;

  @Column({ default: false })
  phoneVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  phoneVerificationCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  phoneVerificationExpires: Date | null;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  emailVerificationToken: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  emailOtp: string | null;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  emailOtpExpires: Date | null;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  resetPasswordToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  resetPasswordExpires: Date | null;

  @Column({ type: 'varchar', nullable: true })
  googleId: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatar: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: true })
  smsNotifications: boolean;

  @Column({ default: true })
  emailNotifications: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ default: 0 })
  totalPredictions: number;

  @Column({ default: 0 })
  correctPredictions: number;

  @Column({ type: 'varchar', nullable: true })
  subscriptionPlan: string | null;

  @Column({ type: 'varchar', default: 'inactive' })
  subscriptionStatus: string; // active, inactive, expired

  @Column({ type: 'timestamp', nullable: true })
  subscriptionStartDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  subscriptionEndDate: Date | null;

  @Column({ default: false })
  subscriptionRenewalNotified: boolean;

  @Column({ type: 'varchar', unique: true, nullable: true })
  referralCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  referredBy: string | null; // Referral code of the person who referred this user

  @Column({ type: 'int', default: 0 })
  referralPoints: number; // 1 point = KSH 10

  @Column({ type: 'int', default: 0 })
  totalReferrals: number; // Count of people referred

  @OneToMany(() => Prediction, (prediction) => prediction.user)
  predictions: Prediction[];

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
