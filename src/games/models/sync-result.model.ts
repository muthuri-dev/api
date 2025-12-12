import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class SyncResult {
  @Field()
  success: boolean;

  @Field()
  message: string;
}
