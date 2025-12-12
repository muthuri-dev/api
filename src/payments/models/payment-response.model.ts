import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class PaymentInitResponse {
  @Field()
  authorization_url: string;

  @Field()
  access_code: string;

  @Field()
  reference: string;
}

@ObjectType()
export class PaymentChannel {
  @Field()
  name: string;

  @Field()
  description: string;

  @Field()
  icon: string;
}
