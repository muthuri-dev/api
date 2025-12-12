import { InputType, Field } from '@nestjs/graphql';
import { IsString, Length } from 'class-validator';

@InputType()
export class VerifyPhoneInput {
  @Field()
  @IsString()
  phone: string;

  @Field()
  @IsString()
  @Length(6, 6)
  code: string;
}
