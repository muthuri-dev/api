import { InputType, Field, Float } from '@nestjs/graphql';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

@InputType()
export class UpdateGameTipInput {
  @Field()
  @IsString()
  gameId: string;

  @Field()
  @IsBoolean()
  isFree: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  tipText?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tipConfidence?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  tipOutcome?: string;
}
