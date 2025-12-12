import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AfricasTalkingService } from '../notifications/africastalking.service';
import { PaymentsService } from '../payments/payments.service';
import { SendSmsInput } from './dto/send-sms.input';

@Injectable()
export class AdminService {
  constructor(
    private usersService: UsersService,
    private smsService: AfricasTalkingService, // Changed from SmsService
    private paymentsService: PaymentsService,
  ) {}

  async getDashboardStats(): Promise<any> {
    const users = await this.usersService.findAll();
    const payments = await this.paymentsService.findAll();

    // Calculate total revenue from completed payments
    const totalRevenue = payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Calculate total payouts (could be withdrawals or refunds if you have them)
    const totalPayouts = payments
      .filter((p) => p.type === 'withdrawal' && p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.emailVerified).length,
      totalGames: 0, // TODO: Implement
      liveGames: 0, // TODO: Implement
      totalPredictions: users.reduce((sum, u) => sum + u.totalPredictions, 0),
      todayPredictions: 0, // TODO: Implement
      totalRevenue,
      totalPayouts,
    };
  }

  async sendSmsToUser(sendSmsInput: SendSmsInput): Promise<any> {
    const user = await this.usersService.findById(sendSmsInput.userId);

    if (user.phone && user.smsNotifications) {
      await this.smsService.sendSms(user.phone, sendSmsInput.message);
    }

    return { success: true, message: 'SMS sent successfully' };
  }

  async sendBulkSms(message: string, userIds: string[]): Promise<any> {
    const users = await Promise.all(
      userIds.map((id) => this.usersService.findById(id)),
    );

    const phoneNumbers = users
      .filter((u) => u.phone && u.smsNotifications)
      .map((u) => u.phone)
      .filter((phone): phone is string => phone !== null);

    await this.smsService.sendBulkSms(phoneNumbers, message);

    return {
      success: true,
      message: `SMS sent to ${phoneNumbers.length} users`,
    };
  }

  async sendSmsToAllUsers(message: string): Promise<any> {
    const users = await this.usersService.findAll();

    const phoneNumbers = users
      .filter((u) => u.phone && u.smsNotifications)
      .map((u) => u.phone)
      .filter((phone): phone is string => phone !== null);

    await this.smsService.sendBulkSms(phoneNumbers, message);

    return {
      success: true,
      message: `SMS sent to ${phoneNumbers.length} users`,
    };
  }
}
