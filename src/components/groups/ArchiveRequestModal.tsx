import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Ionicons } from '@expo/vector-icons';

interface ArchiveRequestModalProps {
  visible: boolean;
  requesterName: string;
  onClose: () => void;
  onArchive: (reason: string, notes?: string) => void;
  loading?: boolean;
}

const ARCHIVE_REASONS = [
  'No longer interested',
  'Not contactable',
  'Group at capacity',
  'Not suitable for group',
];

const FooterButtons: React.FC<{
  onCancel: () => void;
  onArchive: () => void;
  loading: boolean;
  disabled: boolean;
}> = ({ onCancel, onArchive, loading, disabled }) => (
  <View style={styles.footer}>
    <Button
      title="Cancel"
      onPress={onCancel}
      variant="secondary"
      disabled={loading}
      style={styles.cancelButton}
    />
    <Button
      title="Archive"
      onPress={onArchive}
      variant="danger"
      loading={loading}
      disabled={disabled}
      style={styles.archiveButton}
    />
  </View>
);

export const ArchiveRequestModal: React.FC<ArchiveRequestModalProps> = ({
  visible,
  requesterName,
  onClose,
  onArchive,
  loading = false,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);

  const handleArchive = () => {
    if (!selectedReason) {
      return;
    }
    onArchive(selectedReason, notes.trim() || undefined);
  };

  const handleClose = () => {
    setSelectedReason('');
    setNotes('');
    setShowReasonDropdown(false);
    onClose();
  };

  const handleSelectReason = (reason: string) => {
    setSelectedReason(reason);
    setShowReasonDropdown(false);
  };

  return (
    <Modal
      isVisible={visible}
      onClose={handleClose}
      title="Archive Newcomer"
      size="large"
      scrollable={true}
    >
      <View style={styles.container}>
        <Text style={styles.subtitle}>Archiving {requesterName}'s request</Text>

        <View style={styles.formSection}>
          <Text style={styles.label}>Reason for archiving</Text>

          {/* Reason Selector */}
          <TouchableOpacity
            style={styles.reasonSelector}
            onPress={() => setShowReasonDropdown(!showReasonDropdown)}
            disabled={loading}
          >
            <Text
              style={[
                styles.reasonSelectorText,
                !selectedReason && styles.reasonSelectorPlaceholder,
              ]}
            >
              {selectedReason || 'Select a reason'}
            </Text>
            <Ionicons
              name={showReasonDropdown ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>

          {/* Dropdown Options */}
          {showReasonDropdown && (
            <View style={styles.dropdown}>
              {ARCHIVE_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.dropdownItem,
                    selectedReason === reason && styles.dropdownItemSelected,
                  ]}
                  onPress={() => handleSelectReason(reason)}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedReason === reason &&
                        styles.dropdownItemTextSelected,
                    ]}
                  >
                    {reason}
                  </Text>
                  {selectedReason === reason && (
                    <Ionicons name="checkmark" size={20} color="#ec4899" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Optional Notes */}
          <View style={styles.notesSection}>
            <Text style={styles.label}>Additional notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add any additional context..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
              editable={!loading}
            />
            <Text style={styles.characterCount}>{notes.length}/500</Text>
          </View>
        </View>
      </View>

      <FooterButtons
        onCancel={handleClose}
        onArchive={handleArchive}
        loading={loading}
        disabled={!selectedReason || loading}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  formSection: {
    gap: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  reasonSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#fff',
  },
  reasonSelectorText: {
    fontSize: 16,
    color: '#1f2937',
  },
  reasonSelectorPlaceholder: {
    color: '#9ca3af',
  },
  dropdown: {
    marginTop: -12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  dropdownItemSelected: {
    backgroundColor: '#fce7f3',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1f2937',
  },
  dropdownItemTextSelected: {
    color: '#ec4899',
    fontWeight: '600',
  },
  notesSection: {
    marginTop: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1f2937',
    backgroundColor: '#fff',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  archiveButton: {
    flex: 1,
  },
});
