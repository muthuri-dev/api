import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { EmailService } from '../notifications/email.service';
import { AfricasTalkingService } from '../notifications/africastalking.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendEmailOtpInput } from './dto/send-email-otp.input';
import { VerifyEmailOtpInput } from './dto/verify-email-otp.input';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private smsService: AfricasTalkingService, // Changed from SmsService
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, phone, referralCode } =
      registerDto;

    // Check phone first (required field)
    const existingPhone = await this.usersService.findByPhone(phone);
    if (existingPhone) {
      throw new ConflictException('User with this phone number already exists');
    }

    // Check email if provided (optional)
    if (email) {
      const existingUser = await this.usersService.findByEmail(email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Validate referral code if provided
    if (referralCode) {
      const referrer = await this.usersService.findByReferralCode(referralCode);
      if (!referrer) {
        throw new BadRequestException('Invalid referral code');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const emailOtp = this.smsService.generateOTP();
    const emailOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const phoneVerificationCode = this.smsService.generateOTP();
    const phoneVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      phone,
      emailOtp,
      emailOtpExpires,
      phoneVerificationCode,
      phoneVerificationExpires,
      referredBy: referralCode || null,
    });

    // Award referral points if valid referral code was used
    if (referralCode) {
      try {
        const referrer =
          await this.usersService.findByReferralCode(referralCode);
        if (referrer) {
          const newPoints = (referrer.referralPoints || 0) + 1;
          const newTotal = (referrer.totalReferrals || 0) + 1;

          await this.usersService.update(referrer.id, {
            referralPoints: newPoints,
            totalReferrals: newTotal,
          });

          console.log(
            `✅ Awarded referral point to ${referrer.email}: ${newPoints} points, ${newTotal} total referrals`,
          );
        }
      } catch (error) {
        console.error('Failed to award referral points:', error.message);
      }
    }

    // Send email OTP only if email is provided
    if (user.email) {
      try {
        await this.emailService.sendOtpEmail(user.email, emailOtp);
        console.log('✅ Email OTP sent to:', user.email);
        console.log('🔐 Email OTP (DEV ONLY):', emailOtp); // Remove in production
      } catch (error) {
        console.error('❌ Failed to send email OTP:', error.message);
      }
    }

    // Send SMS OTP (required)
    try {
      await this.smsService.sendOTP(user.phone, phoneVerificationCode);
      console.log('✅ OTP SMS sent to:', user.phone);
      console.log('🔐 OTP Code (DEV ONLY):', phoneVerificationCode); // Remove in production
    } catch (error) {
      console.error('❌ Failed to send OTP SMS:', error.message);
      throw new BadRequestException(
        'Failed to send verification code. Please try again.',
      );
    }

    return {
      message:
        'Registration successful. Please check your phone for the verification code.',
    };
  }

  async verifyPhone(phone: string, code: string) {
    const user = await this.usersService.findByPhone(phone);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.phoneVerified) {
      throw new BadRequestException('Phone number already verified');
    }

    if (!user.phoneVerificationCode || !user.phoneVerificationExpires) {
      throw new BadRequestException('No verification code found');
    }

    if (user.phoneVerificationExpires < new Date()) {
      throw new BadRequestException('Verification code expired');
    }

    if (user.phoneVerificationCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.usersService.update(user.id, {
      phoneVerified: true,
      phoneVerificationCode: null,
      phoneVerificationExpires: null,
    });

    return { message: 'Phone number verified successfully' };
  }

  async resendPhoneOTP(phone: string) {
    const user = await this.usersService.findByPhone(phone);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.phoneVerified) {
      throw new BadRequestException('Phone number already verified');
    }

    if (!user.phone) {
      throw new BadRequestException('Phone number not found');
    }

    const phoneVerificationCode = this.smsService.generateOTP();
    const phoneVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);

    await this.usersService.update(user.id, {
      phoneVerificationCode,
      phoneVerificationExpires,
    });

    try {
      await this.smsService.sendOTP(user.phone, phoneVerificationCode);
      console.log('✅ OTP resent to:', user.phone);
      console.log('🔐 New OTP Code (DEV ONLY):', phoneVerificationCode); // Remove in production
    } catch (error) {
      console.error('❌ Failed to resend OTP:', error.message);
      throw new BadRequestException(
        'Failed to send OTP. Please try again later.',
      );
    }

    return { message: 'OTP resent successfully' };
  }

  async sendPhoneOtpToCurrentUser(userId: string) {
    const user = await this.usersService.findById(userId);

    console.log('🔍 DEBUG - sendPhoneOtpToCurrentUser');
    console.log('User ID:', userId);
    console.log('User found:', user ? 'YES' : 'NO');
    console.log('User phone:', user?.phone);
    console.log('User phoneVerified:', user?.phoneVerified);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.phone) {
      throw new BadRequestException('Please add a phone number first');
    }

    // Allow re-verification to support phone number changes
    const phoneVerificationCode = this.smsService.generateOTP();
    const phoneVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);

    console.log('📝 Updating user with OTP:', phoneVerificationCode);

    await this.usersService.update(user.id, {
      phoneVerificationCode,
      phoneVerificationExpires,
    });

    console.log('✅ User updated in database');

    try {
      await this.smsService.sendOTP(user.phone, phoneVerificationCode);
      console.log('✅ OTP sent to:', user.phone);
      console.log('🔐 OTP Code (DEV ONLY):', phoneVerificationCode);
    } catch (error) {
      console.error('❌ Failed to send OTP:', error.message);
      throw new BadRequestException(
        'Failed to send OTP. Please try again later.',
      );
    }

    return { message: 'OTP sent successfully' };
  }

  async verifyPhoneForCurrentUser(userId: string, code: string) {
    const user = await this.usersService.findById(userId);

    console.log('🔍 DEBUG - verifyPhoneForCurrentUser');
    console.log('User ID:', userId);
    console.log('Code provided:', code);
    console.log('User found:', user ? 'YES' : 'NO');
    console.log(
      'User phoneVerificationCode in DB:',
      user?.phoneVerificationCode,
    );
    console.log(
      'User phoneVerificationExpires:',
      user?.phoneVerificationExpires,
    );
    console.log('Codes match:', user?.phoneVerificationCode === code);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Allow re-verification to support phone number changes

    if (!user.phoneVerificationCode || !user.phoneVerificationExpires) {
      throw new BadRequestException('No verification code found');
    }

    if (user.phoneVerificationExpires < new Date()) {
      throw new BadRequestException('Verification code expired');
    }

    if (user.phoneVerificationCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.usersService.update(user.id, {
      phoneVerified: true,
      phoneVerificationCode: null,
      phoneVerificationExpires: null,
    });

    return { message: 'Phone number verified successfully' };
  }

  async login(loginDto: LoginDto) {
    console.log('🔍 LOGIN DEBUG - Input:', loginDto.email);
    const user = await this.validateUser(loginDto.email, loginDto.password);
    console.log('🔍 LOGIN DEBUG - User found:', !!user);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log('🔍 LOGIN DEBUG - Phone verified:', user.phoneVerified);
    if (!user.phoneVerified) {
      throw new UnauthorizedException('Please verify your phone number first');
    }

    const payload = {
      sub: user.id,
      email: user.email || user.phone,
      role: user.role,
    };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user,
    };
  }

  async validateUser(emailOrPhone: string, password: string) {
    console.log('🔍 VALIDATE DEBUG - Input:', emailOrPhone);
    // Try to find user by phone first, then email
    let user = await this.usersService.findByPhone(emailOrPhone);
    console.log('🔍 VALIDATE DEBUG - User by phone:', !!user);
    if (!user) {
      user = await this.usersService.findByEmail(emailOrPhone);
      console.log('🔍 VALIDATE DEBUG - User by email:', !!user);
    }

    if (
      user &&
      user.password &&
      (await bcrypt.compare(password, user.password))
    ) {
      console.log('🔍 VALIDATE DEBUG - Password match: true');
      return user;
    }
    console.log('🔍 VALIDATE DEBUG - Password match: false');
    return null;
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.usersService.update(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
    });

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.email) {
      return { message: 'If email exists, password reset link has been sent' };
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.usersService.update(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires,
    });

    await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'Password reset link sent to email' };
  }

  async resetPassword(token: string, password: string) {
    const user = await this.usersService.findByResetToken(token);

    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.usersService.update(user.id, {
      password: hashedPassword,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
    });

    return { message: 'Password reset successfully' };
  }

  async googleLogin(profile: any) {
    let user = await this.usersService.findByGoogleId(profile.id);

    if (!user) {
      user = await this.usersService.findByEmail(profile.emails[0].value);

      if (user) {
        await this.usersService.update(user.id, { googleId: profile.id });
      } else {
        user = await this.usersService.create({
          email: profile.emails[0].value,
          fullName: profile.displayName,
          googleId: profile.id,
          emailVerified: true,
          avatar: profile.photos?.[0]?.value,
        });
      }
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user,
    };
  }

  // Email OTP Login Flow (Passwordless)
  async sendEmailOtp(sendEmailOtpInput: SendEmailOtpInput) {
    const { email } = sendEmailOtpInput;

    // Find or create user
    let user = await this.usersService.findByEmail(email);

    if (!user) {
      // Create new user with just email (passwordless registration)
      user = await this.usersService.create({
        email,
        password: null,
        emailVerified: false,
      });
    }

    // Generate 6-digit OTP
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const emailOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await this.usersService.update(user.id, {
      emailOtp: emailOtp,
      emailOtpExpires: emailOtpExpires,
    });

    // Send OTP via email
    try {
      await this.emailService.sendOtpEmail(email, emailOtp);
      console.log('✅ OTP email sent to:', email);
      console.log('🔐 OTP Code (DEV ONLY):', emailOtp); // Remove in production
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error.message);
      throw new BadRequestException(
        'Failed to send OTP. Please try again later.',
      );
    }

    return { message: 'OTP sent to your email successfully' };
  }

  async verifyEmailOtp(verifyEmailOtpInput: VerifyEmailOtpInput) {
    const { email, otp } = verifyEmailOtpInput;

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.emailOtp || !user.emailOtpExpires) {
      throw new BadRequestException('No OTP found. Please request a new one.');
    }

    if (user.emailOtpExpires < new Date()) {
      throw new BadRequestException(
        'OTP has expired. Please request a new one.',
      );
    }

    if (user.emailOtp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Clear OTP and mark email as verified
    await this.usersService.update(user.id, {
      emailOtp: null,
      emailOtpExpires: null,
      emailVerified: true,
    });

    // Generate JWT token for authenticated session
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user,
    };
  }
}
