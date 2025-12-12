import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminResolver } from './admin.resolver';
import { UsersModule } from '../users/users.module';
import { GamesModule } from '../games/games.module';
import { PredictionsModule } from '../predictions/predictions.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    UsersModule,
    GamesModule,
    PredictionsModule,
    PaymentsModule,
    NotificationsModule,
  ],
  providers: [AdminService, AdminResolver],
})
export class AdminModule {}
