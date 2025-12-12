import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

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

  async create(userData: Partial<User>): Promise<User> {
    // Format phone number if provided
    if (userData.phone) {
      userData.phone = this.formatPhoneNumber(userData.phone);
    }

    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { googleId } });
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { emailVerificationToken: token },
    });
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { resetPasswordToken: token },
    });
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    // Check if email is being updated and if it's already taken
    if (updateData.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateData.email },
      });
      if (existingUser && existingUser.id !== id) {
        throw new Error('Email already in use by another account');
      }
    }

    // Format phone number if provided
    if (updateData.phone) {
      updateData.phone = this.formatPhoneNumber(updateData.phone);

      // Check if phone number changed
      const currentUser = await this.findById(id);
      if (currentUser.phone && currentUser.phone !== updateData.phone) {
        // Phone number changed, reset verification status only
        // Don't clear verification codes here - let sendPhoneOtp handle that
        updateData.phoneVerified = false;
      }
    }

    await this.usersRepository.update(id, updateData);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async updateBalance(userId: string, amount: number): Promise<User> {
    const user = await this.findById(userId);
    user.balance = Number(user.balance) + amount;
    return this.usersRepository.save(user);
  }

  async incrementPredictions(userId: string, correct: boolean): Promise<User> {
    const user = await this.findById(userId);
    user.totalPredictions += 1;
    if (correct) {
      user.correctPredictions += 1;
    }
    return this.usersRepository.save(user);
  }

  async findByPhone(phone: string): Promise<User | null> {
    const formattedPhone = this.formatPhoneNumber(phone);
    return this.usersRepository.findOne({ where: { phone: formattedPhone } });
  }

  async generateReferralCode(userId: string): Promise<string> {
    const user = await this.findById(userId);

    if (user.referralCode) {
      return user.referralCode;
    }

    // Generate unique referral code: First 3 letters of name + 4 random chars
    const namePrefix =
      (user.fullName || user.email || user.phone)
        ?.replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 3)
        .toUpperCase() || 'USR';

    let referralCode = '';
    let isUnique = false;

    while (!isUnique) {
      const randomSuffix = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
      referralCode = `${namePrefix}${randomSuffix}`;

      const existing = await this.usersRepository.findOne({
        where: { referralCode },
      });

      if (!existing) {
        isUnique = true;
      }
    }

    user.referralCode = referralCode;
    await this.usersRepository.save(user);

    return referralCode;
  }

  async findByReferralCode(referralCode: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { referralCode } });
  }

  async applyReferral(userId: string, referralCode: string): Promise<boolean> {
    const user = await this.findById(userId);

    // Can't refer yourself or if already referred
    if (user.referredBy) {
      throw new Error('User already has a referrer');
    }

    const referrer = await this.findByReferralCode(referralCode);

    if (!referrer) {
      throw new Error('Invalid referral code');
    }

    if (referrer.id === userId) {
      throw new Error('Cannot refer yourself');
    }

    // Apply referral
    user.referredBy = referralCode;
    await this.usersRepository.save(user);

    // Award points to referrer (1 point per referral)
    referrer.referralPoints += 1;
    referrer.totalReferrals += 1;
    await this.usersRepository.save(referrer);

    return true;
  }

  async useReferralPoints(userId: string, points: number): Promise<number> {
    const user = await this.findById(userId);

    if (user.referralPoints < points) {
      throw new Error('Insufficient referral points');
    }

    user.referralPoints -= points;
    await this.usersRepository.save(user);

    return points * 10; // Return discount value in KSH
  }
}
