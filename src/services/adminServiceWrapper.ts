import {
  groupAdminService,
  userAdminService,
  type AdminServiceResponse,
  type GroupWithAdminDetails,
  type UserWithGroupStatus,
  type ChurchUserSummary,
  type GroupJoinRequest,
} from './admin';
import {
  AppError,
  handleSupabaseError,
  retryWithBackoff,
  NetworkError,
  PermissionError,
} from '../utils/errorHandling';
import { globalErrorHandler } from '../utils/globalErrorHandler';

interface ServiceWrapperOptions {
  maxRetries?: number;
  logErrors?: boolean;
  context?: Record<string, any>;
}

/**
 * Enhanced wrapper for admin services with comprehensive error handling
 */
export class AdminServiceWrapper {
  private defaultOptions: ServiceWrapperOptions = {
    maxRetries: 3,
    logErrors: true,
    context: {},
  };

  /**
   * Execute a service operation with enhanced error handling
   */
  private async executeWithErrorHandling<T>(
    operation: () => Promise<AdminServiceResponse<T>>,
    operationName: string,
    options: ServiceWrapperOptions = {}
  ): Promise<AdminServiceResponse<T>> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const result = await retryWithBackoff(
        async () => {
          const response = await operation();

          // If the service returned an error, throw it to trigger retry logic
          if (response.error) {
            throw response.error;
          }

          return response;
        },
        opts.maxRetries,
        1000
      );

      return result;
    } catch (error) {
      // Keep the original error if it's already an AppError, otherwise convert it
      const appError = (error as any).type
        ? (error as AppError)
        : handleSupabaseError(error as Error);

      if (opts.logErrors) {
        globalErrorHandler.logError(appError, {
          operation: operationName,
          ...opts.context,
        });
      }

      return {
        data: null,
        error: appError,
      };
    }
  }

  /**
   * Get church groups with enhanced error handling
   */
  async getChurchGroups(
    churchId: string,
    includeAll: boolean = false,
    options: ServiceWrapperOptions = {}
  ): Promise<AdminServiceResponse<GroupWithAdminDetails[]>> {
    return this.executeWithErrorHandling(
      () => groupAdminService.getChurchGroups(churchId, includeAll),
      'getChurchGroups',
      {
        ...options,
        context: { churchId, includeAll, ...options.context },
      }
    );
  }

  /**
   * Approve group with enhanced error handling and optimistic updates
   */
  async approveGroup(
    groupId: string,
    adminId: string,
    reason?: string,
    options: ServiceWrapperOptions = {}
  ): Promise<AdminServiceResponse<any>> {
    return this.executeWithErrorHandling(
      () => groupAdminService.approveGroup(groupId, adminId, reason),
      'approveGroup',
      {
        ...options,
        context: { groupId, adminId, reason, ...options.context },
      }
    );
  }

  /**
   * Decline group with enhanced error handling
   */
  async declineGroup(
    groupId: string,
    adminId: string,
    reason?: string,
    options: ServiceWrapperOptions = {}
  ): Promise<AdminServiceResponse<any>> {
    return this.executeWithErrorHandling(
      () => groupAdminService.declineGroup(groupId, adminId, reason),
      'declineGroup',
      {
        ...options,
        context: { groupId, adminId, reason, ...options.context },
      }
    );
  }

  /**
   * Close group with enhanced error handling
   */
  async closeGroup(
    groupId: string,
    adminId: string,
    reason?: string,
    options: ServiceWrapperOptions = {}
  ): Promise<AdminServiceResponse<any>> {
    return this.executeWithErrorHandling(
      () => groupAdminService.closeGroup(groupId, adminId, reason),
      'closeGroup',
      {
        ...options,
        context: { groupId, adminId, reason, ...options.context },
      }
    );
  }

  /**
   * Get group requests with enhanced error handling
   */
  async getGroupRequests(
    groupId: string,
    options: ServiceWrapperOptions = {}
  ): Promise<AdminServiceResponse<GroupJoinRequest[]>> {
    return this.executeWithErrorHandling(
      () => groupAdminService.getGroupRequests(groupId),
      'getGroupRequests',
      {
        ...options,
        context: { groupId, ...options.context },
      }
    );
  }

  /**
   * Approve join request with enhanced error handling
   */
  async approveJoinRequest(
    requestId: string,
    options: ServiceWrapperOptions = {}
  ): Promise<AdminServiceResponse<boolean>> {
    return this.executeWithErrorHandling(
      () => groupAdminService.approveJoinRequest(requestId),
      'approveJoinRequest',
      {
        ...options,
        context: { requestId, ...options.context },
      }
    );
  }

  /**
   * Decline join request with enhanced error handling
   */
  async declineJoinRequest(
    requestId: string,
    options: ServiceWrapperOptions = {}
  ): Promise<AdminServiceResponse<boolean>> {
    return this.executeWithErrorHandling(
      () => groupAdminService.declineJoinRequest(requestId),
      'declineJoinRequest',
      {
        ...options,
        context: { requestId, ...options.context },
      }
    );
  }

  /**
   * Get church users with enhanced error handling
   */
  async getChurchUsers(
    churchId: string,
    options: ServiceWrapperOptions = {}
  ): Promise<AdminServiceResponse<UserWithGroupStatus[]>> {
    return this.executeWithErrorHandling(
      () => userAdminService.getChurchUsers(churchId),
      'getChurchUsers',
      {
        ...options,
        context: { churchId, ...options.context },
      }
    );
  }

  /**
   * Get unconnected users with enhanced error handling
   */
  async getUnconnectedUsers(
    churchId: string,
    options: ServiceWrapperOptions = {}
  ): Promise<AdminServiceResponse<UserWithGroupStatus[]>> {
    return this.executeWithErrorHandling(
      () => userAdminService.getUnconnectedUsers(churchId),
      'getUnconnectedUsers',
      {
        ...options,
        context: { churchId, ...options.context },
      }
    );
  }

  /**
   * Get church summary with enhanced error handling
   */
  async getChurchSummary(
    churchId: string,
    options: ServiceWrapperOptions = {}
  ): Promise<AdminServiceResponse<ChurchUserSummary>> {
    return this.executeWithErrorHandling(
      () => userAdminService.getChurchSummary(churchId),
      'getChurchSummary',
      {
        ...options,
        context: { churchId, ...options.context },
      }
    );
  }

  /**
   * Batch approve multiple groups
   */
  async batchApproveGroups(
    groupIds: string[],
    adminId: string,
    options: ServiceWrapperOptions = {}
  ): Promise<{
    successful: string[];
    failed: Array<{ groupId: string; error: AppError }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ groupId: string; error: AppError }> = [];

    for (const groupId of groupIds) {
      const result = await this.approveGroup(groupId, adminId, undefined, {
        ...options,
        maxRetries: 1, // Reduce retries for batch operations
      });

      if (result.error) {
        failed.push({ groupId, error: result.error });
      } else {
        successful.push(groupId);
      }
    }

    return { successful, failed };
  }

  /**
   * Batch decline multiple groups
   */
  async batchDeclineGroups(
    groupIds: string[],
    adminId: string,
    reason?: string,
    options: ServiceWrapperOptions = {}
  ): Promise<{
    successful: string[];
    failed: Array<{ groupId: string; error: AppError }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ groupId: string; error: AppError }> = [];

    for (const groupId of groupIds) {
      const result = await this.declineGroup(groupId, adminId, reason, {
        ...options,
        maxRetries: 1, // Reduce retries for batch operations
      });

      if (result.error) {
        failed.push({ groupId, error: result.error });
      } else {
        successful.push(groupId);
      }
    }

    return { successful, failed };
  }

  /**
   * Health check for admin services
   */
  async healthCheck(churchId: string): Promise<{
    isHealthy: boolean;
    services: {
      groups: boolean;
      users: boolean;
      summary: boolean;
    };
    errors: AppError[];
  }> {
    const errors: AppError[] = [];
    const services = {
      groups: false,
      users: false,
      summary: false,
    };

    // Test groups service
    const groupsResult = await this.getChurchGroups(churchId, false, {
      maxRetries: 1,
      logErrors: false,
    });
    services.groups = !groupsResult.error;
    if (groupsResult.error) errors.push(groupsResult.error);

    // Test users service
    const usersResult = await this.getChurchUsers(churchId, {
      maxRetries: 1,
      logErrors: false,
    });
    services.users = !usersResult.error;
    if (usersResult.error) errors.push(usersResult.error);

    // Test summary service
    const summaryResult = await this.getChurchSummary(churchId, {
      maxRetries: 1,
      logErrors: false,
    });
    services.summary = !summaryResult.error;
    if (summaryResult.error) errors.push(summaryResult.error);

    const isHealthy = services.groups && services.users && services.summary;

    return {
      isHealthy,
      services,
      errors,
    };
  }
}

// Export singleton instance
export const adminServiceWrapper = new AdminServiceWrapper();
