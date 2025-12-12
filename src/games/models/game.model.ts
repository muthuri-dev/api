import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class Team {
  @Field()
  name: string;

  @Field({ nullable: true })
  logo?: string;

  @Field(() => Int, { nullable: true })
  score?: number;
}

@ObjectType()
export class StatPair {
  @Field(() => Int)
  home: number;

  @Field(() => Int)
  away: number;
}

@ObjectType()
export class GameStatistics {
  @Field(() => StatPair, { nullable: true })
  possession?: StatPair;

  @Field(() => StatPair, { nullable: true })
  shots?: StatPair;

  @Field(() => StatPair, { nullable: true })
  shotsOnTarget?: StatPair;

  @Field(() => StatPair, { nullable: true })
  corners?: StatPair;

  @Field(() => StatPair, { nullable: true })
  fouls?: StatPair;

  @Field(() => StatPair, { nullable: true })
  yellowCards?: StatPair;

  @Field(() => StatPair, { nullable: true })
  redCards?: StatPair;

  @Field(() => StatPair, { nullable: true })
  offsides?: StatPair;
}

@ObjectType()
export class TeamForm {
  @Field(() => [String], { nullable: true })
  home?: string[];

  @Field(() => [String], { nullable: true })
  away?: string[];
}

@ObjectType()
export class HeadToHeadMatch {
  @Field()
  date: string;

  @Field()
  homeTeam: string;

  @Field()
  awayTeam: string;

  @Field()
  score: string;
}

@ObjectType()
export class HeadToHead {
  @Field(() => Int, { nullable: true })
  homeWins?: number;

  @Field(() => Int, { nullable: true })
  draws?: number;

  @Field(() => Int, { nullable: true })
  awayWins?: number;

  @Field(() => [HeadToHeadMatch], { nullable: true })
  lastMatches?: HeadToHeadMatch[];
}

@ObjectType()
export class Game {
  @Field(() => ID)
  id: string;

  @Field()
  sport: string;

  @Field()
  league: string;

  @Field(() => Team)
  homeTeam: Team;

  @Field(() => Team)
  awayTeam: Team;

  @Field()
  startTime: Date;

  @Field()
  status: string;

  @Field({ nullable: true })
  venue?: string;

  @Field(() => Float, { nullable: true })
  homeOdds?: number;

  @Field(() => Float, { nullable: true })
  awayOdds?: number;

  @Field(() => Float, { nullable: true })
  drawOdds?: number;

  @Field({ nullable: true })
  externalId?: string;

  @Field(() => Int)
  totalPredictions: number;

  @Field()
  isFree: boolean;

  @Field({ nullable: true })
  tipText?: string;

  @Field({ nullable: true })
  tipConfidence?: number;

  @Field({ nullable: true })
  tipOutcome?: string;

  @Field(() => GameStatistics, { nullable: true })
  statistics?: GameStatistics;

  @Field(() => TeamForm, { nullable: true })
  teamForm?: TeamForm;

  @Field(() => HeadToHead, { nullable: true })
  headToHead?: HeadToHead;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
