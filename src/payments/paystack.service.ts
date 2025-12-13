import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
  PaymentType,
} from './entities/payment.entity';
import { User } from '../users/entities/user.entity';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly secretKey: string;
  private readonly callbackUrl: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
  ) {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    this.callbackUrl =
      process.env.PAYSTACK_CALLBACK_URL ||
      'http://localhost:3001/payment/verify';

    if (!this.secretKey) {
      this.logger.warn('⚠️  PAYSTACK_SECRET_KEY not set');
    } else {
      this.logger.log('✅ Paystack service initialized');
    }
  }

  /**
   * Initialize a payment transaction
   * Supports M-Pesa and other payment channels via Paystack
   */
  async initializeTransaction(
    user: User,
    amount: number,
    planName: string,
    metadata?: any,
  ) {
    try {
      if (!this.secretKey) {
        throw new BadRequestException('Paystack is not configured');
      }

      // Convert amount to kobo (Paystack uses lowest currency denomination)
      const amountInKobo = Math.round(amount * 100);

      // Parse metadata if it's a string
      let parsedMetadata = metadata;
      if (typeof metadata === 'string') {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch (e) {
          parsedMetadata = {};
        }
      }

      // Generate a valid email - sanitize phone numbers that might be in email field
      let customerEmail = user.email;
      
      // Check if email is actually a phone number (starts with + or contains only digits)
      if (customerEmail && /^[\+\d\s\-\(\)]+$/.test(customerEmail)) {
        // Email field contains a phone number, sanitize it
        const cleanPhone = customerEmail.replace(/[^0-9]/g, '');
        customerEmail = `${cleanPhone}@janeonthegame.com`;
      } else if (!customerEmail && user.phone) {
        // No email, use phone
        const cleanPhone = user.phone.replace(/[^0-9]/g, '');
        customerEmail = `${cleanPhone}@janeonthegame.com`;
      } else if (!customerEmail) {
        // Fallback if no email or phone
        customerEmail = `user${user.id.substring(0, 8)}@janeonthegame.com`;
      }

      // Get clean phone number for metadata
      const cleanPhone = user.phone ? user.phone.replace(/[^0-9]/g, '') : null;

      const paymentData = {
        email: customerEmail,
        amount: amountInKobo,
        currency: 'KES',
        reference: this.generateReference(),
        callback_url: this.callbackUrl,
        metadata: {
          user_id: user.id,
          plan_name: planName,
          phone_number: cleanPhone, // Include phone for Paystack
          ...parsedMetadata,
        },
        channels: ['mobile_money', 'card', 'bank'],
      };

      this.logger.log(`Initializing payment: ${JSON.stringify(paymentData, null, 2)}`);

      // Initialize transaction with Paystack using axios
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Paystack response: ${JSON.stringify(response.data, null, 2)}`);

      if (!response.data.status) {
        throw new BadRequestException('Failed to initialize payment');
      }

      // Create payment record in database
      const payment = this.paymentsRepository.create({
        user,
        amount,
        type: PaymentType.DEPOSIT,
        currency: 'KES',
        method: PaymentMethod.PAYSTACK,
        status: PaymentStatus.PENDING,
        reference: paymentData.reference,
        subscriptionPlan: planName,
        subscriptionDurationMonths: parsedMetadata?.duration_months || 1,
        metadata: {
          plan_name: planName,
          paystack_reference: response.data.data.reference,
          access_code: response.data.data.access_code,
        },
      });

      await this.paymentsRepository.save(payment);

      this.logger.log(
        `Payment initialized: ${paymentData.reference} for user ${user.email || user.phone}`,
      );

      return {
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        reference: paymentData.reference,
      };
    } catch (error) {
      this.logger.error(`Failed to initialize payment: ${error.message}`);
      if (error.response) {
        this.logger.error(`Paystack error response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      throw new BadRequestException(
        `Payment initialization failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyTransaction(reference: string) {
    try {
      if (!this.secretKey) {
        throw new BadRequestException('Paystack is not configured');
      }

      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      if (!response.data.status) {
        throw new BadRequestException('Transaction verification failed');
      }

      const data = response.data.data;

      // Find payment in database
      const payment = await this.paymentsRepository.findOne({
        where: { reference },
        relations: ['user'],
      });

      if (!payment) {
        throw new BadRequestException('Payment record not found');
      }

      // Update payment status
      const amountPaid = data.amount / 100; // Convert from kobo to KES

      if (data.status === 'success' && amountPaid >= payment.amount) {
        payment.status = PaymentStatus.COMPLETED;
        payment.metadata = {
          ...payment.metadata,
          paystack_response: {
            transaction_id: data.id,
            paid_at: data.paid_at,
            channel: data.channel,
            ip_address: data.ip_address,
            currency: data.currency,
            authorization: data.authorization,
          },
        };

        this.logger.log(
          `✅ Payment verified: ${reference} - ${payment.amount} KES`,
        );
      } else {
        payment.status = PaymentStatus.FAILED;
        payment.metadata = {
          ...payment.metadata,
          failure_reason: data.gateway_response || 'Payment failed',
        };

        this.logger.warn(`❌ Payment failed: ${reference}`);
      }

      await this.paymentsRepository.save(payment);

      // Return the full payment entity (not a plain object)
      return payment;
    } catch (error) {
      this.logger.error(`Transaction verification failed: ${error.message}`);
      
      // Try to find payment and update it to failed
      try {
        const payment = await this.paymentsRepository.findOne({
          where: { reference },
          relations: ['user'],
        });
        
        if (payment) {
          payment.status = PaymentStatus.FAILED;
          payment.metadata = {
            ...payment.metadata,
            failure_reason: error.message || 'Verification failed',
          };
          await this.paymentsRepository.save(payment);
          return payment;
        }
      } catch (e) {
        // Ignore errors finding payment
      }
      
      throw new BadRequestException(`Verification failed: ${error.message}`);
    }
  }

  /**
   * Handle Paystack webhook events
   */
  async handleWebhook(payload: any, signature: string) {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload, signature)) {
        throw new BadRequestException('Invalid webhook signature');
      }

      const event = payload.event;
      const data = payload.data;

      this.logger.log(`Webhook received: ${event}`);

      switch (event) {
        case 'charge.success':
          await this.handleChargeSuccess(data);
          break;

        case 'charge.failed':
          await this.handleChargeFailed(data);
          break;

        default:
          this.logger.log(`Unhandled webhook event: ${event}`);
      }

      return { status: 'success' };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle successful charge webhook
   */
  private async handleChargeSuccess(data: any) {
    const reference = data.reference;

    const payment = await this.paymentsRepository.findOne({
      where: { reference },
      relations: ['user'],
    });

    if (!payment) {
      this.logger.warn(`Payment not found for reference: ${reference}`);
      return;
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      this.logger.log(`Payment already marked as completed: ${reference}`);
      return;
    }

    payment.status = PaymentStatus.COMPLETED;
    payment.metadata = {
      ...payment.metadata,
      webhook_data: {
        transaction_id: data.id,
        paid_at: data.paid_at,
        channel: data.channel,
        amount: data.amount / 100,
      },
    };

    await this.paymentsRepository.save(payment);

    this.logger.log(`✅ Webhook: Payment completed ${reference}`);

    // TODO: Activate user subscription here
    // await this.subscriptionService.activateSubscription(payment.user, payment.metadata.plan_name);
  }

  /**
   * Handle failed charge webhook
   */
  private async handleChargeFailed(data: any) {
    const reference = data.reference;

    const payment = await this.paymentsRepository.findOne({
      where: { reference },
    });

    if (!payment) {
      return;
    }

    payment.status = PaymentStatus.FAILED;
    payment.metadata = {
      ...payment.metadata,
      failure_reason: data.gateway_response,
    };

    await this.paymentsRepository.save(payment);

    this.logger.warn(`❌ Webhook: Payment failed ${reference}`);
  }

  /**
   * Verify Paystack webhook signature
   */
  private verifyWebhookSignature(payload: any, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }

  /**
   * Generate unique payment reference
   */
  private generateReference(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `PAY-${timestamp}-${random}`;
  }

  /**
   * Get payment channels supported by Paystack
   */
  getPaymentChannels() {
    return {
      mobile_money: {
        name: 'M-Pesa',
        description: 'Pay via M-Pesa mobile money',
        icon: '📱',
      },
      card: {
        name: 'Card',
        description: 'Pay with Visa, Mastercard, or Verve',
        icon: '💳',
      },
      bank: {
        name: 'Bank Transfer',
        description: 'Direct bank transfer',
        icon: '🏦',
      },
      ussd: {
        name: 'USSD',
        description: 'Pay via USSD code',
        icon: '📞',
      },
    };
  }

  /**
   * Get all payments for a user
   */
  async getUserPayments(userId: string) {
    return this.paymentsRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }
}
