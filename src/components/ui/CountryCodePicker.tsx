import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  FlatList,
} from 'react-native';

type Country = {
  name: string;
  code: string; // +1
  flag: string; // emoji
};

const COUNTRIES: Country[] = [
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'New Zealand', code: '+64', flag: '🇳🇿' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
  { name: 'Spain', code: '+34', flag: '🇪🇸' },
  { name: 'Italy', code: '+39', flag: '🇮🇹' },
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬' },
  { name: 'South Africa', code: '+27', flag: '🇿🇦' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷' },
  { name: 'Nigeria', code: '+234', flag: '🇳🇬' },
  { name: 'Philippines', code: '+63', flag: '🇵🇭' },
  { name: 'Pakistan', code: '+92', flag: '🇵🇰' },
];

export function CountryCodePicker({
  value,
  onChange,
  label = 'Country',
}: {
  value: string;
  onChange: (code: string) => void;
  label?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(() => {
    return (
      COUNTRIES.find((c) => c.code === value) || {
        name: 'Custom',
        code: value || '+',
        flag: '📱',
      }
    );
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.replace('+', '').startsWith(q.replace('+', ''))
    );
  }, [query]);

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
      >
        <Text style={styles.flag}>{selected.flag}</Text>
        <Text style={styles.codeText}>{selected.code}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select country</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search country or code"
              style={styles.search}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => `${item.name}-${item.code}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => {
                    onChange(item.code);
                    setVisible(false);
                  }}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                  </View>
                  <Text style={styles.itemCode}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  flag: {
    fontSize: 18,
    marginRight: 8,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  search: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemName: {
    fontSize: 16,
    color: '#111827',
  },
  itemCode: {
    fontSize: 14,
    color: '#6b7280',
  },
  closeBtn: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#111827',
    borderRadius: 8,
  },
  closeText: {
    color: '#fff',
    fontWeight: '600',
  },
});


