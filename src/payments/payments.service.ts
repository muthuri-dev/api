import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    private usersService: UsersService,
  ) {}

  async getPaymentStatus(paymentId: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
      relations: ['user'],
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    return payment;
  }

  async findByUser(userId: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }
}
