// Barrel exports for hooks
export { useAuth } from './useAuth';
export {
  useUserProfile,
  useUserGroupMemberships,
  useUserFriendships,
  useSearchUsers,
  useUpdateUserProfile,
  useUploadAvatar,
  useDeleteAvatar,
  userKeys,
} from './useUsers';
export {
  useGroupsByChurch,
  useGroup,
  useUserGroups,
  useGroupMembers,
  useGroupMembership,
  useSearchGroups,
  useJoinGroup,
  useLeaveGroup,
  useSendGroupReferral,
  groupKeys,
} from './useGroups';
export {
  useEventsByChurch,
  useEvent,
  useUserEvents,
  useEventCategories,
  useEventsByCategory,
  useUserTicket,
  useSearchEvents,
  useUpcomingEvents,
  useCreateTicket,
  useCancelTicket,
  eventKeys,
} from './useEvents';
export {
  useFriends,
  useSentFriendRequests,
  useReceivedFriendRequests,
  useFriendshipStatus,
  useFriendshipsByStatus,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useRejectFriendRequest,
  useAcceptRejectedFriendRequest,
  useRemoveFriend,
  useFriendshipData,
  friendshipKeys,
} from './useFriendships';
export { useNetworkStatus } from './useNetworkStatus';
export { useAsyncOperation } from './useAsyncOperation';
export {
  useAdminAsyncOperation,
  useAdminBatchOperation,
} from './useAdminAsyncOperation';
export { useErrorHandler } from './useErrorHandler';
export { useLoadingState } from './useLoadingState';
export {
  usePermissions,
  useRoleCheck,
  usePermissionCheck,
} from './usePermissions';
export {
  useUpdateGroupDetails,
  usePromoteToLeader,
  useDemoteFromLeader,
  useRemoveMember,
  useGroupLeaderActions,
} from './useGroupLeaderActions';
export {
  useGroupJoinRequests,
  useUserJoinRequests,
  useCreateJoinRequest,
  useApproveJoinRequest,
  useDeclineJoinRequest,
  useCancelJoinRequest,
  useGetContactInfo,
  useUpdateMembershipJourneyStatus,
  joinRequestKeys,
} from './useJoinRequests';
export {
  useUserContactLogs,
  useGroupContactLogs,
  usePrivacySettings,
  useUpdatePrivacySettings,
  useCanShareContact,
  contactAuditKeys,
} from './useContactAudit';
export {
  useUserReferrals,
  useGroupReferrals,
  useReferralsForUser,
  useReferralStatistics,
  useReferralCounts,
  useCreateGeneralReferral,
  useCreateGroupReferral,
  useCreateReferral,
  useCreateBatchReferrals,
  useReferralValidation,
  useReferrals,
  useGroupReferralOperations,
  referralKeys,
} from './useReferrals';

// Style Performance Hooks
export {
  useOptimizedStyles,
  useMemoizedStyleCalculation,
  useStylePerformanceMonitor,
  useOptimizedThemeSwitch,
  useBatchedStyleOperations,
  useStylePerformanceDebug,
  withStylePerformanceMonitoring,
  useCriticalStylePreloader,
  useStyleCacheManagement,
} from './useStylePerformance';

// Enhanced Notification Hooks
export {
  useNotifications,
  useLegacyNotificationSettings,
  useEventReminders,
  useNotificationPermissions,
  useAdminNotifications,
  useEnhancedNotifications,
  useNotificationPanel,
  useNotificationBadge,
  useNotificationSettings,
  useNotificationNavigation,
} from './useNotifications';
