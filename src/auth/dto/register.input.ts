import { InputType, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsOptional,
} from 'class-validator';

@InputType()
export class RegisterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field()
  @IsString()
  @MinLength(6)
  password: string;

  @Field()
  @IsString()
  firstName: string;

  @Field()
  @IsString()
  lastName: string;

  @Field()
  @IsString()
  @Matches(/^(\+?254|0)?[17]\d{8}$/, {
    message:
      'Invalid Kenyan phone number. Examples: 0712345678, +254712345678, 712345678',
  })
  phone: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  referralCode?: string;
}
