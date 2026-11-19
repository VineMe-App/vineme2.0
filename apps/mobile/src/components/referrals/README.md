# Referral Components

This directory contains components for the referral system that allows users to refer new people to the VineMe community.

## Components

### ReferralFormModal

A reusable modal component for collecting referral information from users.

#### Features

- **Dual Purpose**: Works for both general referrals and group-specific referrals
- **Form Validation**: Real-time validation with user-friendly error messages
- **Loading States**: Shows loading indicators during form submission
- **Error Handling**: Graceful error handling with user feedback
- **Accessibility**: Full accessibility support with proper labels and roles
- **Responsive**: Adapts to different screen sizes with keyboard avoidance

#### Props

```typescript
interface ReferralFormModalProps {
  visible: boolean; // Controls modal visibility
  onClose: () => void; // Called when modal should close
  groupId?: string; // Optional - for group-specific referrals
  onSubmit: (data: ReferralFormData) => Promise<void>; // Form submission handler
  groupName?: string; // Optional - for display in group referrals
}
```

#### Form Data

```typescript
interface ReferralFormData {
  email: string; // Required - referred person's email
  phone: string; // Required - referred person's phone
  note: string; // Optional - context note
  firstName?: string; // Optional - referred person's first name
  lastName?: string; // Optional - referred person's last name
}
```

#### Usage Examples

##### General Referral

```tsx
import { ReferralFormModal } from '@/components/referrals';

const [modalVisible, setModalVisible] = useState(false);

const handleSubmit = async (data: ReferralFormData) => {
  await referralService.createGeneralReferral(data);
};

<ReferralFormModal
  visible={modalVisible}
  onClose={() => setModalVisible(false)}
  onSubmit={handleSubmit}
/>;
```

##### Group Referral

```tsx
import { ReferralFormModal } from '@/components/referrals';

const [modalVisible, setModalVisible] = useState(false);

const handleSubmit = async (data: ReferralFormData) => {
  await referralService.createGroupReferral({
    ...data,
    groupId: 'group-123',
  });
};

<ReferralFormModal
  visible={modalVisible}
  onClose={() => setModalVisible(false)}
  onSubmit={handleSubmit}
  groupId="group-123"
  groupName="Bible Study Group"
/>;
```

#### Validation Rules

- **Email**: Required, must be valid email format
- **Phone**: Required, must be 10-15 digits (formatting characters ignored)
- **Note**: Optional, maximum 500 characters
- **Names**: Optional, maximum 50 characters each

#### Error Handling

The component handles various error scenarios:

- **Validation Errors**: Real-time field validation with specific error messages
- **Submission Errors**: Network/API errors with retry options
- **Loading States**: Prevents multiple submissions and shows loading indicators

#### Accessibility

- All form fields have proper labels and accessibility attributes
- Error messages are announced to screen readers
- Keyboard navigation is fully supported
- Focus management for modal interactions

#### Testing

The component includes comprehensive tests covering:

- Form validation logic
- Submission handling
- Error scenarios
- User interactions
- Accessibility features

Run tests with:

```bash
npm test -- src/components/referrals/__tests__/
```

#### Dependencies

- React Native UI components (Modal, Input, Button, Form)
- Theme system for consistent styling
- Form validation utilities

#### Integration

This component is designed to work with:

- `ReferralService` for API calls
- `useReferrals` hook for state management
- Navigation system for routing
- Authentication system for user context
