import { Resolver, Mutation, Query, Args, Float } from '@nestjs/graphql';
import { UseGuards, SetMetadata } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';
import { InvoiceService } from './invoice.service';
import { Payment } from './models/payment.model';
import { PaymentInitResponse } from './models/payment-response.model';
import { InitializePaymentInput } from './dto/initialize-payment.input';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { GqlRolesGuard } from '../common/guards/gql-roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Resolver(() => Payment)
export class PaymentsResolver {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paystackService: PaystackService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Query(() => [Payment])
  @UseGuards(GqlAuthGuard)
  async myPayments(@CurrentUser() user: any) {
    return this.paymentsService.findByUser(user.id);
  }

  @Query(() => Payment)
  @UseGuards(GqlAuthGuard)
  async paymentStatus(@Args('paymentId') paymentId: string) {
    return this.paymentsService.getPaymentStatus(paymentId);
  }

  @Query(() => String)
  @UseGuards(GqlAuthGuard)
  async generateInvoice(@Args('paymentId') paymentId: string) {
    const payment = await this.paymentsService.getPaymentStatus(paymentId);
    const pdfBuffer = await this.invoiceService.generateInvoice(payment);
    return pdfBuffer.toString('base64');
  }

  @Query(() => [Payment])
  @UseGuards(GqlAuthGuard, GqlRolesGuard)
  @SetMetadata('roles', [UserRole.ADMIN])
  async allPayments() {
    return this.paymentsService.findAll();
  }

  // ============ PAYSTACK MUTATIONS ============

  @Mutation(() => PaymentInitResponse)
  @UseGuards(GqlAuthGuard)
  async initializePaystackPayment(
    @CurrentUser() user: any,
    @Args('input') input: InitializePaymentInput,
  ) {
    const metadata = input.metadata ? JSON.parse(input.metadata) : undefined;
    return this.paystackService.initializeTransaction(
      user,
      input.amount,
      input.planName,
      metadata,
    );
  }

  @Query(() => Payment)
  @UseGuards(GqlAuthGuard)
  async verifyPaystackPayment(@Args('reference') reference: string) {
    return this.paystackService.verifyTransaction(reference);
  }
}
