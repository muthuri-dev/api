import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsString, Length } from 'class-validator';

@InputType()
export class VerifyEmailOtpInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @Length(6, 6)
  otp: string;
}
