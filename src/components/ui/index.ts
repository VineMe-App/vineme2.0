// Barrel exports for UI components
export { Avatar } from './Avatar';
export { Badge } from './Badge';
export { Button } from './Button';
export { Card } from './Card';
export { Checkbox } from './Checkbox';
export { ComingSoonBanner } from './ComingSoonBanner';
export { Divider } from './Divider';
export { Input } from './Input';
export { LoadingSpinner } from './LoadingSpinner';
export { LoadingButton } from './LoadingButton';

// Loading and Animation components
export {
  Spinner,
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  ProgressBar,
  CircularProgress,
  FadeIn,
  SlideIn,
  ScaleIn,
  Pulse,
  StaggeredAnimation,
} from './Loading';
export type {
  SpinnerProps,
  SkeletonProps,
  SkeletonTextProps,
  SkeletonAvatarProps,
  ProgressBarProps,
  CircularProgressProps,
  FadeInProps,
  SlideInProps,
  ScaleInProps,
  PulseProps,
  StaggeredAnimationProps,
} from './Loading';
export { Modal } from './Modal';
export { Overlay } from './Overlay';
export { Backdrop } from './Backdrop';
export { Portal, PortalHost } from './Portal';
export type { ModalProps } from './Modal';
export type { OverlayProps } from './Overlay';
export type { BackdropProps } from './Backdrop';
export type { PortalProps, PortalHostProps } from './Portal';
export { Select } from './Select';
export { ErrorMessage } from './ErrorMessage';

// Text components
export { 
  Text,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  BodyText,
  BodyLarge,
  BodySmall,
  Caption,
  Label,
  LabelLarge,
  LabelSmall,
} from './Text';
export type { TextProps } from './Text';
export { EmptyState } from './EmptyState';
export { OfflineBanner } from './OfflineBanner';
export { OptimizedImage, preloadImages, useImageCache } from './OptimizedImage';
export {
  RoleBasedRender,
  AdminOnly,
  SuperAdminOnly,
  ChurchMemberOnly,
  PermissionGate,
  GroupLeaderOnly,
  ChurchAdminOnly,
} from './RoleBasedRender';
export {
  AdminErrorBoundary,
  AdminActionError,
  AdminLoadingOverlay,
  AdminRetryableError,
} from './AdminErrorBoundary';
export {
  AdminLoadingCard,
  AdminBatchLoading,
  AdminSkeletonLoader,
  AdminLoadingList,
  AdminRetryLoading,
} from './AdminLoadingStates';
export { AnimatedCard } from './AnimatedCard';
export { NotificationBadge } from './NotificationBadge';
export { AccessibleStatusIndicator } from './AccessibleStatusIndicator';
export { ConfirmationDialog, AdminConfirmations } from './ConfirmationDialog';

// Form components
export { Form, FormField, useFormContext } from './Form';
export type {
  FormConfig,
  FormValues,
  FormErrors,
  ValidationRule,
  FieldConfig,
} from './Form';
export type { SelectOption } from './Select';
