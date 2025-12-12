import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsNumber, IsString, IsOptional, Min } from 'class-validator';

@InputType()
export class InitializePaymentInput {
  @Field()
  @IsNumber()
  @Min(1)
  amount: number;

  @Field()
  @IsString()
  planName: string;

  @Field({ nullable: true })
  @IsOptional()
  metadata?: string; // JSON string
}
