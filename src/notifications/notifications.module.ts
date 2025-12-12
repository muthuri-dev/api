import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './email.service';
import { AfricasTalkingService } from './africastalking.service';
import { SubscriptionSchedulerService } from './subscription-scheduler.service';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [
    EmailService,
    AfricasTalkingService,
    SubscriptionSchedulerService,
  ],
  exports: [EmailService, AfricasTalkingService],
})
export class NotificationsModule {}
