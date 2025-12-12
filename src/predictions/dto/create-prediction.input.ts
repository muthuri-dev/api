import { InputType, Field, Float } from '@nestjs/graphql';
import { IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';

@InputType()
export class CreatePredictionInput {
  @Field()
  @IsString()
  gameId: string;

  @Field()
  @IsString()
  predictedOutcome: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}
