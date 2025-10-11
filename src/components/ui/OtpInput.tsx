import React, { useRef, useMemo } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

export function OtpInput({
  value,
  onChange,
  length = 6,
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
}) {
  const refs = useMemo(
    // eslint-disable-next-line react-hooks/rules-of-hooks
    () => Array.from({ length }, () => useRef<TextInput>(null)),
    [length]
  );
  const digits = value.split('').slice(0, length);

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, i) => (
        <TextInput
          key={i}
          ref={refs[i]}
          value={digits[i] || ''}
          onChangeText={(t) => {
            const d = t.replace(/[^0-9]/g, '').slice(-1);
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
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  box: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 22,
    backgroundColor: '#fff',
  },
});
