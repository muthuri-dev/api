import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('EMAIL_HOST'),
      port: this.configService.get('EMAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASSWORD'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM'),
      to: email,
      subject: 'Verify your email - Jane on the Game',
      html: `
        <h1>Email Verification</h1>
        <p>Click the link below to verify your email:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM'),
      to: email,
      subject: 'Password Reset - Jane on the Game',
      html: `
        <h1>Password Reset</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
      `,
    });
  }

  async sendNotification(
    email: string,
    subject: string,
    message: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM'),
      to: email,
      subject,
      html: message,
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM'),
      to,
      subject,
      html: htmlContent,
    });
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM'),
      to: email,
      subject: 'Your Login Code - Jane on the Game',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">Jane on the Game</h1>
            <h2 style="color: #666; font-weight: normal;">Your Login Code</h2>
          </div>
          
          <p style="font-size: 16px; color: #666; margin-bottom: 30px;">
            Use the following code to log in to your account:
          </p>
          
          <div style="background-color: #f4f4f4; padding: 30px; text-align: center; border-radius: 8px; margin: 30px 0;">
            <div style="font-size: 48px; font-weight: bold; letter-spacing: 12px; color: #333; font-family: 'Courier New', monospace;">
              ${otp}
            </div>
          </div>
          
          <p style="font-size: 14px; color: #999; margin-top: 30px;">
            This code will expire in 10 minutes.
          </p>
          
          <p style="font-size: 14px; color: #999;">
            If you didn't request this code, please ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            © ${new Date().getFullYear()} Jane on the Game. All rights reserved.
          </p>
        </div>
      `,
    });
  }
}
