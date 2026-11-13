import React, { useRef } from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';

export function OtpInput({
  value,
  onChange,
  length = 6,
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
}) {
  // Store refs in a ref object using numeric keys
  const refsMap = useRef<Record<number, React.RefObject<TextInput>>>({});
  
  // Initialize refs for the current length
  const refs = Array.from({ length }, (_, i) => {
    if (!refsMap.current[i]) {
      refsMap.current[i] = React.createRef<TextInput>();
    }
    return refsMap.current[i];
  });
  
  const digits = value.split('').slice(0, length);

  // Handle input - check if full code was pasted (autofill)
  const handleInputChange = (i: number, text: string) => {
    // If text length > 1, it's likely autofill/paste
    if (text.length > 1) {
      const cleaned = text.replace(/[^0-9]/g, '').slice(0, length);
      if (cleaned.length === length) {
        onChange(cleaned);
        // Focus the last input after autofill
        setTimeout(() => {
          refs[length - 1].current?.focus();
        }, 100);
        return;
      }
    }
    
    // Normal single digit input
    const d = text.replace(/[^0-9]/g, '').slice(-1);
    const next = (
      value.substring(0, i) +
      d +
      value.substring(i + 1)
    ).slice(0, length);
    onChange(next);
    if (d && i < length - 1) refs[i + 1].current?.focus();
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {Array.from({ length }).map((_, i) => (
          <TextInput
            key={i}
            ref={refs[i]}
            value={digits[i] || ''}
            onChangeText={(t) => handleInputChange(i, t)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && !digits[i] && i > 0) {
                refs[i - 1].current?.focus();
              }
            }}
            keyboardType="number-pad"
            maxLength={i === 0 ? length : 1} // First input can receive full code
            textContentType={i === 0 ? 'oneTimeCode' : 'none'} // Autofill on first input
            autoComplete={i === 0 && Platform.OS === 'ios' ? 'one-time-code' : 'off'}
            style={styles.box}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  box: {
    flex: 1,
    minWidth: 0,
    height: 56,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 22,
    backgroundColor: '#fff',
  },
});
