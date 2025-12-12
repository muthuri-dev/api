import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginResponse } from './models/login-response.model';
import { RegisterInput } from './dto/register.input';
import { LoginInput } from './dto/login.input';
import { VerifyPhoneInput } from './dto/verify-phone.input';
import { SendEmailOtpInput } from './dto/send-email-otp.input';
import { VerifyEmailOtpInput } from './dto/verify-email-otp.input';
import { MessageResponse } from './models/message-response.model';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => MessageResponse)
  async register(@Args('input') registerInput: RegisterInput) {
    return this.authService.register(registerInput);
  }

  @Mutation(() => MessageResponse)
  async verifyPhone(@Args('input') verifyPhoneInput: VerifyPhoneInput) {
    return this.authService.verifyPhone(
      verifyPhoneInput.phone,
      verifyPhoneInput.code,
    );
  }

  @Mutation(() => MessageResponse)
  async resendPhoneOTP(@Args('phone') phone: string) {
    return this.authService.resendPhoneOTP(phone);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => MessageResponse)
  async sendPhoneOtpToCurrentUser(@CurrentUser() user: any) {
    return this.authService.sendPhoneOtpToCurrentUser(user.id);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => MessageResponse)
  async verifyPhoneForCurrentUser(
    @CurrentUser() user: any,
    @Args('code') code: string,
  ) {
    return this.authService.verifyPhoneForCurrentUser(user.id, code);
  }

  @Mutation(() => LoginResponse)
  async login(@Args('input') loginInput: LoginInput) {
    return this.authService.login(loginInput);
  }

  @Mutation(() => MessageResponse)
  async sendEmailOtp(@Args('input') sendEmailOtpInput: SendEmailOtpInput) {
    return this.authService.sendEmailOtp(sendEmailOtpInput);
  }

  @Mutation(() => LoginResponse)
  async verifyEmailOtp(
    @Args('input') verifyEmailOtpInput: VerifyEmailOtpInput,
  ) {
    return this.authService.verifyEmailOtp(verifyEmailOtpInput);
  }

  @Mutation(() => MessageResponse)
  async verifyEmail(@Args('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Mutation(() => MessageResponse)
  async forgotPassword(@Args('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Mutation(() => MessageResponse)
  async resetPassword(
    @Args('token') token: string,
    @Args('password') password: string,
  ) {
    return this.authService.resetPassword(token, password);
  }

  @Query(() => String)
  @UseGuards(GqlAuthGuard)
  async testAuth(@CurrentUser() user: any) {
    return `Hello ${user.email}! Authentication works!`;
  }
}
