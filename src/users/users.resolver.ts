import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards, SetMetadata } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './models/user.model';
import { UpdateUserInput } from './dto/update-user.input';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { GqlRolesGuard } from '../common/guards/gql-roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from './entities/user.entity';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => User, { name: 'me' })
  @UseGuards(GqlAuthGuard)
  async getCurrentUser(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  @Query(() => User, { name: 'user' })
  @UseGuards(GqlAuthGuard)
  async getUser(@Args('id') id: string) {
    return this.usersService.findById(id);
  }

  @Query(() => [User], { name: 'users' })
  @UseGuards(GqlAuthGuard, GqlRolesGuard)
  @SetMetadata('roles', [UserRole.ADMIN])
  async getUsers() {
    return this.usersService.findAll();
  }

  @Mutation(() => User)
  @UseGuards(GqlAuthGuard)
  async updateProfile(
    @CurrentUser() user: any,
    @Args('input') updateUserInput: UpdateUserInput,
  ) {
    return this.usersService.update(user.id, updateUserInput);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async updateNotificationSettings(
    @CurrentUser() user: any,
    @Args('smsNotifications', { type: () => Boolean, nullable: true })
    smsNotifications?: boolean,
    @Args('emailNotifications', { type: () => Boolean, nullable: true })
    emailNotifications?: boolean,
  ) {
    await this.usersService.update(user.id, {
      smsNotifications,
      emailNotifications,
    });
    return true;
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard)
  async generateReferralCode(@CurrentUser() user: any) {
    return this.usersService.generateReferralCode(user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async applyReferralCode(
    @CurrentUser() user: any,
    @Args('referralCode') referralCode: string,
  ) {
    return this.usersService.applyReferral(user.id, referralCode);
  }
}
