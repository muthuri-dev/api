import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { EmailService } from './email.service';
import { AfricasTalkingService } from './africastalking.service';

@Injectable()
export class SubscriptionSchedulerService {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private emailService: EmailService,
    private smsService: AfricasTalkingService,
  ) {}

  // Run every day at 9:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkExpiringSubscriptions() {
    this.logger.log('🔄 Checking for expiring subscriptions...');

    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Find active subscriptions expiring within 3 days that haven't been notified
    const expiringUsers = await this.usersRepository.find({
      where: {
        subscriptionStatus: 'active',
        subscriptionEndDate: LessThan(threeDaysFromNow),
        subscriptionRenewalNotified: false,
      },
    });

    this.logger.log(`📧 Found ${expiringUsers.length} users to notify`);

    for (const user of expiringUsers) {
      try {
        await this.sendRenewalNotification(user);

        // Mark as notified
        user.subscriptionRenewalNotified = true;
        await this.usersRepository.save(user);

        this.logger.log(
          `✅ Notified user ${user.email} about expiring subscription`,
        );
      } catch (error) {
        this.logger.error(
          `❌ Failed to notify user ${user.email}:`,
          error.message,
        );
      }
    }
  }

  // Run every day at midnight to mark expired subscriptions
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiredSubscriptions() {
    this.logger.log('🔄 Checking for expired subscriptions...');

    const now = new Date();

    // Find active subscriptions that have expired
    const expiredUsers = await this.usersRepository.find({
      where: {
        subscriptionStatus: 'active',
        subscriptionEndDate: LessThan(now),
      },
    });

    this.logger.log(`⏰ Found ${expiredUsers.length} expired subscriptions`);

    for (const user of expiredUsers) {
      try {
        user.subscriptionStatus = 'expired';
        await this.usersRepository.save(user);

        await this.sendExpiredNotification(user);

        this.logger.log(`✅ Marked subscription as expired for ${user.email}`);
      } catch (error) {
        this.logger.error(
          `❌ Failed to mark expired for ${user.email}:`,
          error.message,
        );
      }
    }
  }

  private async sendRenewalNotification(user: User) {
    if (!user.subscriptionEndDate) return;

    const daysLeft = Math.ceil(
      (user.subscriptionEndDate.getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const emailSubject = '🔔 Your Subscription is Expiring Soon';
    const emailBody = `
      <h2>Hi ${user.fullName || user.email},</h2>
      <p>Your <strong>${user.subscriptionPlan?.toUpperCase()}</strong> subscription is expiring in <strong>${daysLeft} day(s)</strong>.</p>
      <p><strong>Expiry Date:</strong> ${user.subscriptionEndDate.toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        },
      )}</p>
      <p>Don't miss out on expert predictions and exclusive jackpot alerts!</p>
      <p><a href="${process.env.FRONTEND_URL}/pricing" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 12px;">Renew Now</a></p>
      <p>Best regards,<br/>Jane On The Game Team</p>
    `;

    // Send email
    if (user.email && user.emailVerified && user.emailNotifications) {
      await this.emailService.sendEmail(user.email, emailSubject, emailBody);
    }

    // Send SMS
    if (user.phoneVerified && user.smsNotifications && user.phone) {
      const smsMessage = `Hi ${user.fullName || user.phone}, your ${user.subscriptionPlan?.toUpperCase()} subscription expires in ${daysLeft} day(s). Renew now at ${process.env.FRONTEND_URL}/pricing to continue enjoying expert predictions!`;
      await this.smsService.sendSms(user.phone, smsMessage);
    }
  }

  private async sendExpiredNotification(user: User) {
    if (!user.subscriptionEndDate) return;

    const emailSubject = '⏰ Your Subscription Has Expired';
    const emailBody = `
      <h2>Hi ${user.fullName || user.email},</h2>
      <p>Your <strong>${user.subscriptionPlan?.toUpperCase()}</strong> subscription has expired.</p>
      <p><strong>Expired on:</strong> ${user.subscriptionEndDate.toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        },
      )}</p>
      <p>Renew today to regain access to:</p>
      <ul>
        <li>Daily expert predictions</li>
        <li>All jackpots alerts</li>
        <li>Exclusive mega jackpot predictions</li>
        <li>Priority support</li>
      </ul>
      <p><a href="${process.env.FRONTEND_URL}/pricing" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 12px;">Renew Subscription</a></p>
      <p>Best regards,<br/>Jane On The Game Team</p>
    `;

    // Send email
    if (user.email && user.emailVerified && user.emailNotifications) {
      await this.emailService.sendEmail(user.email, emailSubject, emailBody);
    }

    // Send SMS
    if (user.phoneVerified && user.smsNotifications && user.phone) {
      const smsMessage = `Hi ${user.fullName || user.phone}, your ${user.subscriptionPlan?.toUpperCase()} subscription has expired. Renew now at ${process.env.FRONTEND_URL}/pricing to continue!`;
      await this.smsService.sendSms(user.phone, smsMessage);
    }
  }
}
