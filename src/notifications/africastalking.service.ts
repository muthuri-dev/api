import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const AfricasTalking = require('africastalking');

@Injectable()
export class AfricasTalkingService {
  private smsClient: any;
  private isConfigured: boolean = false;

  constructor(private configService: ConfigService) {
    const username = this.configService.get<string>('AT_USERNAME');
    const apiKey = this.configService.get<string>('AT_API_KEY');

    if (username && apiKey) {
      try {
        const africasTalking = AfricasTalking({
          apiKey,
          username,
        });
        this.smsClient = africasTalking.SMS;
        this.isConfigured = true;
        console.log("✅ Africa's Talking SMS initialized");
      } catch (error) {
        console.error(
          "❌ Failed to initialize Africa's Talking:",
          error.message,
        );
      }
    } else {
      console.warn(
        "⚠️ Africa's Talking not configured - SMS will print to console",
      );
      console.log('To enable SMS:');
      console.log('1. Sign up at https://africastalking.com/');
      console.log('2. Get your API key');
      console.log('3. Update AT_USERNAME and AT_API_KEY in .env');
    }
  }

  /**
   * Generate a 6-digit OTP code
   */
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/[^\d+]/g, '');

    if (cleaned.startsWith('0')) {
      cleaned = '+254' + cleaned.substring(1);
    }

    if (cleaned.startsWith('254') && !cleaned.startsWith('+254')) {
      cleaned = '+' + cleaned;
    }

    if (!cleaned.startsWith('+')) {
      cleaned = '+254' + cleaned;
    }

    return cleaned;
  }

  /**
   * Send OTP code via SMS
   */
  async sendOTP(phone: string, code: string): Promise<void> {
    const message = `Your Jane on the Game verification code is: ${code}. Valid for 10 minutes. Do not share this code with anyone.`;
    await this.sendSms(phone, message);
  }

  /**
   * Send SMS to a single recipient
   */
  async sendSms(to: string, message: string): Promise<void> {
    const formattedPhone = this.formatPhoneNumber(to);

    if (!this.isConfigured) {
      console.warn(
        "⚠️ Africa's Talking not configured, SMS will print to console",
      );
      console.log('📱 SMS that would have been sent:');
      console.log(`To: ${formattedPhone}`);
      console.log(`Message: ${message}`);
      return;
    }

    try {
      const result = await this.smsClient.send({
        to: [formattedPhone],
        message: message,
        // from: this.configService.get('AT_SHORTCODE'), // Optional: Use if you have a shortcode
      });

      console.log("✅ SMS sent successfully via Africa's Talking");
      console.log(`To: ${formattedPhone}`);
      console.log(`Status: ${result.SMSMessageData.Recipients[0].status}`);
      console.log(
        `Message ID: ${result.SMSMessageData.Recipients[0].messageId}`,
      );
    } catch (error) {
      console.error('❌ Failed to send SMS:', error.message);
      throw error;
    }
  }

  /**
   * Send SMS to multiple recipients
   */
  async sendBulkSms(phoneNumbers: string[], message: string): Promise<void> {
    if (!this.isConfigured) {
      console.warn("⚠️ Africa's Talking not configured, skipping bulk SMS");
      console.log(`📱 Would have sent to ${phoneNumbers.length} recipients`);
      return;
    }

    const formattedPhones = phoneNumbers.map((phone) =>
      this.formatPhoneNumber(phone),
    );

    console.log(
      `📤 Sending bulk SMS to ${formattedPhones.length} recipients...`,
    );

    try {
      const result = await this.smsClient.send({
        to: formattedPhones,
        message: message,
      });

      console.log('✅ Bulk SMS sent successfully');
      console.log(`Total: ${result.SMSMessageData.Recipients.length}`);

      result.SMSMessageData.Recipients.forEach((recipient: any) => {
        console.log(`  ${recipient.number}: ${recipient.status}`);
      });
    } catch (error) {
      console.error('❌ Failed to send bulk SMS:', error.message);
      throw error;
    }
  }

  /**
   * Send notification SMS (generic)
   */
  async sendNotification(
    phone: string,
    subject: string,
    body: string,
  ): Promise<void> {
    const message = `${subject}\n\n${body}`;
    await this.sendSms(phone, message);
  }
}
