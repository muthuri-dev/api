import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsResolver } from './payments.resolver';
import { PaymentsController } from './payments.controller';
import { InvoiceService } from './invoice.service';
import { PaystackService } from './paystack.service';
import { Payment } from './entities/payment.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), UsersModule],
  providers: [
    PaymentsService,
    PaymentsResolver,
    InvoiceService,
    PaystackService,
  ],
  controllers: [PaymentsController],
  exports: [PaymentsService, PaystackService],
})
export class PaymentsModule {}
