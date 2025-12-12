import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  UseGuards,
  Request,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PaystackService } from './paystack.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paystackService: PaystackService) {}

  /**
   * Initialize Paystack payment
   * POST /payments/paystack/initialize
   */
  @Post('paystack/initialize')
  @UseGuards(JwtAuthGuard)
  async initializePaystackPayment(
    @Request() req,
    @Body() body: { amount: number; planName: string; metadata?: any },
  ) {
    const { amount, planName, metadata } = body;

    if (!amount || amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    if (!planName) {
      throw new BadRequestException('Plan name is required');
    }

    const user = req.user;

    return this.paystackService.initializeTransaction(
      user,
      amount,
      planName,
      metadata,
    );
  }

  /**
   * Verify Paystack payment
   * GET /payments/paystack/verify?reference=xxx
   */
  @Get('paystack/verify')
  @UseGuards(JwtAuthGuard)
  async verifyPaystackPayment(@Query('reference') reference: string) {
    if (!reference) {
      throw new BadRequestException('Payment reference is required');
    }

    return this.paystackService.verifyTransaction(reference);
  }

  /**
   * Paystack webhook endpoint
   * POST /payments/paystack/webhook
   */
  @Post('paystack/webhook')
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() payload: any,
  ) {
    this.logger.log('Paystack webhook received');

    if (!signature) {
      throw new BadRequestException('No signature provided');
    }

    return this.paystackService.handleWebhook(payload, signature);
  }

  /**
   * Get payment channels
   * GET /payments/channels
   */
  @Get('channels')
  getPaymentChannels() {
    return this.paystackService.getPaymentChannels();
  }

  /**
   * Get user payments history
   * GET /payments/my-payments
   */
  @Get('my-payments')
  @UseGuards(JwtAuthGuard)
  async getMyPayments(@Request() req) {
    return this.paystackService.getUserPayments(req.user.id);
  }
}
