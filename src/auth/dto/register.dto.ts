import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @Matches(/^(\+?254|0)?[17]\d{8}$/, {
    message:
      'Invalid Kenyan phone number. Examples: 0712345678, +254712345678, 712345678',
  })
  phone: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}
