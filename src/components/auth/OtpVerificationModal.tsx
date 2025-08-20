import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { useAuthStore } from '@/stores/auth';

interface OtpVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  phoneOrEmail: string;
  type: 'sms' | 'email';
  onSuccess: (user: any) => void;
  onResend?: () => Promise<{ success: boolean; error?: string }>;
  title?: string;
  subtitle?: string;
}

export function OtpVerificationModal({
  visible,
  onClose,
  phoneOrEmail,
  type,
  onSuccess,
  onResend,
  title,
  subtitle
}: OtpVerificationModalProps) {
  const { verifyOtp, isLoading } = useAuthStore();
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  const codeLength = type === 'sms' ? 4 : 6;
  const displayTitle = title || `Enter ${codeLength}-digit code`;
  const displaySubtitle = subtitle || `Sent to ${phoneOrEmail}`;

  // Countdown timer for resend button
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length !== codeLength) {
      Alert.alert('Error', `Please enter the complete ${codeLength}-digit code`);
      return;
    }

    const result = await verifyOtp(phoneOrEmail, code, type);
    
    if (result.success && result.user) {
      onSuccess(result.user);
      handleClose();
    } else {
      Alert.alert('Verification Failed', result.error || 'Invalid code');
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    if (onResend) {
      const result = await onResend();
      if (result.success) {
        setCountdown(60); // 60 second cooldown
        Alert.alert('Code Sent', 'A new verification code has been sent.');
      } else {
        Alert.alert('Error', result.error || 'Failed to resend code');
      }
    }
  };

  const handleClose = () => {
    setCode('');
    setCountdown(0);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={handleClose}>
      <View style={styles.container}>
        <Text style={styles.title}>{displayTitle}</Text>
        <Text style={styles.subtitle}>{displaySubtitle}</Text>
        
        <View style={styles.otpContainer}>
          <OtpInput 
            value={code} 
            onChange={(text) => setCode(text.replace(/\D/g, '').slice(0, codeLength))} 
            length={codeLength} 
          />
        </View>

        <Button 
          title="Verify" 
          onPress={handleVerify} 
          loading={isLoading}
          style={styles.verifyButton}
        />

        {onResend && (
          <View style={styles.resendContainer}>
            <TouchableOpacity 
              onPress={handleResend} 
              disabled={countdown > 0 || isLoading}
              style={styles.resendButton}
            >
              <Text style={[
                styles.resendText, 
                (countdown > 0 || isLoading) && styles.resendTextDisabled
              ]}>
                {countdown > 0 
                  ? `Resend code in ${countdown}s` 
                  : "Didn't receive code? Resend"
                }
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  otpContainer: {
    marginBottom: 24,
    width: '100%',
  },
  verifyButton: {
    width: '100%',
    marginBottom: 16,
  },
  resendContainer: {
    marginBottom: 16,
  },
  resendButton: {
    padding: 8,
  },
  resendText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  resendTextDisabled: {
    color: '#999',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});