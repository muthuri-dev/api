import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards, SetMetadata } from '@nestjs/common';
import { AdminService } from './admin.service';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { GqlRolesGuard } from '../common/guards/gql-roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { MessageResponse } from '../auth/models/message-response.model';
import { SendSmsInput } from './dto/send-sms.input';
import { DashboardStats } from './models/dashboard-stats.model';

@Resolver()
@UseGuards(GqlAuthGuard, GqlRolesGuard)
@SetMetadata('roles', [UserRole.ADMIN])
export class AdminResolver {
  constructor(private readonly adminService: AdminService) {}

  @Query(() => DashboardStats, { name: 'adminDashboard' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Mutation(() => MessageResponse)
  async sendSmsToUser(@Args('input') sendSmsInput: SendSmsInput) {
    return this.adminService.sendSmsToUser(sendSmsInput);
  }

  @Mutation(() => MessageResponse)
  async sendBulkSms(
    @Args('message') message: string,
    @Args('userIds', { type: () => [String] }) userIds: string[],
  ) {
    return this.adminService.sendBulkSms(message, userIds);
  }

  @Mutation(() => MessageResponse)
  async sendSmsToAllUsers(@Args('message') message: string) {
    return this.adminService.sendSmsToAllUsers(message);
  }
}
