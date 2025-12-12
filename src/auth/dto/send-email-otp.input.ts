import { InputType, Field } from '@nestjs/graphql';
import { IsEmail } from 'class-validator';

@InputType()
export class SendEmailOtpInput {
  @Field()
  @IsEmail()
  email: string;
}
