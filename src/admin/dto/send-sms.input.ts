import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsUUID } from 'class-validator';

@InputType()
export class SendSmsInput {
  @Field()
  @IsUUID()
  userId: string;

  @Field()
  @IsString()
  message: string;
}
