import React, { useRef } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

export function OtpInput({
  value,
  onChange,
  length = 4,
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
}) {
  const refs = Array.from({ length }, () => useRef<TextInput>(null));
  const digits = value.split('').slice(0, length);

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, i) => (
        <TextInput
          key={i}
          ref={refs[i]}
          value={digits[i] || ''}
          onChangeText={(t) => {
            const numericText = t.replace(/[^0-9]/g, '');

            // Handle paste - if we get multiple digits
            if (numericText.length > 1) {
              const pasteValue = numericText.slice(0, length); // Take only the first 'length' digits
              onChange(pasteValue.padEnd(length, ''));
              // Focus the last filled box or the next empty one
              const lastIndex = Math.min(pasteValue.length - 1, length - 1);
              if (lastIndex < length - 1) {
                refs[lastIndex + 1]?.current?.focus();
              }
              return;
            }

            // Handle normal single digit input
            const d = numericText.slice(-1);
            const next = (
              value.substring(0, i) +
              d +
              value.substring(i + 1)
            ).slice(0, length);
            onChange(next);
            if (d && i < length - 1) refs[i + 1].current?.focus();
          }}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && !digits[i] && i > 0) {
              refs[i - 1].current?.focus();
            }
          }}
          keyboardType="number-pad"
          maxLength={1}
          style={styles.box}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
    alignSelf: 'center',
    maxWidth: '100%',
  },
  box: {
    width: 44,
    height: 50,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
});
