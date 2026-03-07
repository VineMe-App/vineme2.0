// App-specific TypeScript interfaces for components and services

import { AuthResponse } from '@supabase/supabase-js';
import { User, Group, Event, Friendship } from './database';

// Authentication types (AuthResponse is exported from services/auth)

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Onboarding types
export interface OnboardingData {
  first_name: string;
  last_name: string;
  church_id?: string;
  service_id?: string;
  group_status?: 'existing' | 'looking';
  avatar_url?: string;
  bio?: string;
  requested_church?: boolean;
}

export interface OnboardingStep {
  id: string;
  title: string;
  subtitle?: string;
  component: React.ComponentType<OnboardingStepProps>;
}

export interface OnboardingStepProps {
  data: OnboardingData;
  onNext: (stepData: Partial<OnboardingData>) => void;
  onBack: () => void;
  canGoBack: boolean;
  isLoading?: boolean;
  error?: string | null;
}

// Navigation types
export interface TabBarItem {
  name: string;
  title: string;
  icon: string;
  activeIcon?: string;
}

// Component prop types
export interface GroupCardProps {
  group: Group;
  onPress: (group: Group) => void;
  showMembershipStatus?: boolean;
}

export interface EventCardProps {
  event: Event;
  onPress: (event: Event) => void;
  showRegistrationStatus?: boolean;
}

export interface UserCardProps {
  user: User;
  onPress?: (user: User) => void;
  showFriendshipStatus?: boolean;
}

export interface FriendRequestCardProps {
  friendship: Friendship;
  onAccept: (friendshipId: string) => void;
  onReject: (friendshipId: string) => void;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'multiselect' | 'textarea';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  validation?: (value: any) => string | null;
}

export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
}

// Service layer types
export interface AuthService {
  signIn(credentials: SignInCredentials): Promise<AuthResponse>;
  signUp(credentials: SignUpCredentials): Promise<AuthResponse>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  updateProfile(userId: string, updates: Partial<User>): Promise<User>;
}

export interface GroupService {
  getGroups(churchId: string): Promise<Group[]>;
  getGroupById(id: string): Promise<Group>;
  joinGroup(groupId: string, userId: string): Promise<void>;
  leaveGroup(groupId: string, userId: string): Promise<void>;
  getUserGroupMemberships(userId: string): Promise<Group[]>;
}

export interface EventService {
  getEvents(churchId: string): Promise<Event[]>;
  getEventById(id: string): Promise<Event>;
  registerForEvent(eventId: string, userId: string): Promise<void>;
  getUserEvents(userId: string): Promise<Event[]>;
}

export interface UserService {
  getUserById(id: string): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  uploadAvatar(userId: string, file: File): Promise<string>;
  searchUsers(query: string, churchId: string): Promise<User[]>;
}

export interface FriendshipService {
  sendFriendRequest(userId: string, friendId: string): Promise<void>;
  acceptFriendRequest(friendshipId: string): Promise<void>;
  rejectFriendRequest(friendshipId: string): Promise<void>;
  getFriends(userId: string): Promise<User[]>;
  getFriendRequests(userId: string): Promise<Friendship[]>;
}

// State management types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UIState {
  isLoading: boolean;
  loadingMessage?: string;
  error: string | null;
  activeModal: string | null;
  modalData: any;
}

// API response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Utility types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export type MembershipRole = 'member' | 'leader' | 'admin';

export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export type GroupStatus = 'pending' | 'approved' | 'denied' | 'closed';
