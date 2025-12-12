import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
class StatPairInput {
  @Field(() => Int)
  home: number;

  @Field(() => Int)
  away: number;
}

@InputType()
class GameStatisticsInput {
  @Field(() => StatPairInput, { nullable: true })
  possession?: StatPairInput;

  @Field(() => StatPairInput, { nullable: true })
  shots?: StatPairInput;

  @Field(() => StatPairInput, { nullable: true })
  shotsOnTarget?: StatPairInput;

  @Field(() => StatPairInput, { nullable: true })
  corners?: StatPairInput;

  @Field(() => StatPairInput, { nullable: true })
  fouls?: StatPairInput;

  @Field(() => StatPairInput, { nullable: true })
  yellowCards?: StatPairInput;

  @Field(() => StatPairInput, { nullable: true })
  redCards?: StatPairInput;

  @Field(() => StatPairInput, { nullable: true })
  offsides?: StatPairInput;
}

@InputType()
class TeamFormInput {
  @Field(() => [String], { nullable: true })
  home?: string[];

  @Field(() => [String], { nullable: true })
  away?: string[];
}

@InputType()
class HeadToHeadMatchInput {
  @Field()
  date: string;

  @Field()
  homeTeam: string;

  @Field()
  awayTeam: string;

  @Field()
  score: string;
}

@InputType()
class HeadToHeadInput {
  @Field(() => Int, { nullable: true })
  homeWins?: number;

  @Field(() => Int, { nullable: true })
  draws?: number;

  @Field(() => Int, { nullable: true })
  awayWins?: number;

  @Field(() => [HeadToHeadMatchInput], { nullable: true })
  lastMatches?: HeadToHeadMatchInput[];
}

@InputType()
export class UpdateGameStatisticsInput {
  @Field()
  gameId: string;

  @Field(() => GameStatisticsInput, { nullable: true })
  statistics?: GameStatisticsInput;

  @Field(() => TeamFormInput, { nullable: true })
  teamForm?: TeamFormInput;

  @Field(() => HeadToHeadInput, { nullable: true })
  headToHead?: HeadToHeadInput;
}
