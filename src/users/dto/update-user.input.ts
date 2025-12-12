import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsString, IsEmail, Matches, IsInt } from 'class-validator';

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  fullName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^(\+?254|0)?[17]\d{8}$/, {
    message:
      'Invalid Kenyan phone number. Examples: 0712345678, +254712345678, 712345678',
  })
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  avatar?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  referralPoints?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  totalReferrals?: number;
}
