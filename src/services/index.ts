// Barrel exports for services
export { supabase } from './supabase';
export { authService } from './auth';
export { churchService } from './churches';
export { userService } from './users';
export { groupService } from './groups';
export { eventService } from './events';
export { friendshipService } from './friendships';
export { permissionService } from './permissions';
export type { AuthResponse, SignUpData, SignInData } from './auth';
export type { UpdateUserProfileData, UserServiceResponse } from './users';
export type {
  GroupServiceResponse,
  CreateGroupMembershipData,
  GroupReferralData,
} from './groups';
export type { EventServiceResponse, CreateTicketData } from './events';
export type {
  FriendshipServiceResponse,
  FriendshipWithUser,
  FriendshipStatus,
} from './friendships';
