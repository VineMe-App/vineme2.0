import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/auth';
import { emailVerificationService } from '../../services/emailVerification';
import { useAuthStore } from '../../stores/auth';

interface EmailVerificationBannerProps {
  style?: any;
}

export const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  style,
}) => {
  const { user } = useAuthStore();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    checkVerificationStatus();
  }, [user]);

  const checkVerificationStatus = async () => {
    if (!user?.id) {
      setIsVerified(null);
      return;
    }

    try {
      const verified = await authService.isEmailVerified(user.id);
      setIsVerified(verified);
    } catch (error) {
      console.error('Error checking email verification status:', error);
      setIsVerified(null);
    }
  };

  const handleResendEmail = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'No email address found for your account.');
      return;
    }

    setIsResending(true);

    try {
      const result = await emailVerificationService.resendVerificationEmail(
        user.email
      );

      if (result.success) {
        Alert.alert(
          'Email Sent',
          'A new verification email has been sent to your inbox. Please check your email and click the verification link.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          result.error || 'Failed to resend verification email. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to resend verification email. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsResending(false);
    }
  };

  // Don't show banner if user is not logged in or email is already verified
  if (!user || isVerified === true || isVerified === null) {
    return null;
  }

  return (
    <View style={[styles.banner, style]}>
      <View style={styles.content}>
        <Ionicons name="mail-outline" size={20} color="#FF9500" />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.message}>
            Please check your email and click the verification link to complete your account setup.
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.resendButton}
        onPress={handleResendEmail}
        disabled={isResending}
      >
        <Text style={styles.resendButtonText}>
          {isResending ? 'Sending...' : 'Resend'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 16,
  },
  resendButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 12,
  },
  resendButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});