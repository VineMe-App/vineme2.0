import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Ionicons } from '@expo/vector-icons';
import {
  useMembershipNotes,
  useCreateManualNote,
} from '../../hooks/useGroupMembershipNotes';
import type { GroupMembershipNoteWithUser } from '../../types/database';

interface MembershipNotesSectionProps {
  membershipId: string;
  groupId: string;
  userId: string;
  leaderId: string;
  readOnly?: boolean;
}

export const MembershipNotesSection: React.FC<MembershipNotesSectionProps> = ({
  membershipId,
  groupId,
  userId,
  leaderId,
  readOnly = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  const { data: notes, isLoading } = useMembershipNotes(membershipId, leaderId);
  const createNoteMutation = useCreateManualNote();

  const handleAddNote = async () => {
    if (!noteText.trim()) {
      Alert.alert('Error', 'Please enter a note');
      return;
    }

    try {
      await createNoteMutation.mutateAsync({
        noteData: {
          membership_id: membershipId,
          group_id: groupId,
          user_id: userId,
          note_text: noteText.trim(),
        },
        leaderId,
      });

      setNoteText('');
      setShowAddNote(false);
      Alert.alert('Success', 'Note added successfully');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to add note'
      );
    }
  };

  const formatNoteTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getNoteIcon = (type: GroupMembershipNoteWithUser['note_type']) => {
    switch (type) {
      case 'request_approved':
        return { name: 'checkmark-circle' as const, color: '#ff0083' };
      case 'request_archived':
        return { name: 'archive' as const, color: '#6b7280' };
      case 'member_left':
        return { name: 'exit' as const, color: '#ef4444' };
      case 'journey_status_change':
        return { name: 'trending-up' as const, color: '#8b5cf6' };
      case 'role_change':
        return { name: 'people' as const, color: '#f59e0b' };
      case 'manual':
      default:
        return { name: 'document-text' as const, color: '#3b82f6' };
    }
  };

  const getNoteDescription = (note: GroupMembershipNoteWithUser) => {
    switch (note.note_type) {
      case 'request_approved':
        return `Approved to join the group`;
      case 'request_archived':
        return `Request ${note.reason ? `archived: ${note.reason}` : 'archived'}`;
      case 'member_left':
        return `Left the group${note.reason ? `: ${note.reason}` : ''}`;
      case 'journey_status_change':
        return `Journey progress: ${note.previous_journey_status || 'New'} → ${note.new_journey_status}`;
      case 'role_change':
        return `Role changed: ${note.previous_role} → ${note.new_role}`;
      case 'manual':
      default:
        return note.note_text || '';
    }
  };

  const noteCount = notes?.length || 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons
            name="document-text-outline"
            size={18}
            color="#6b7280"
            style={styles.headerIcon}
          />
          <Text style={styles.headerTitle}>Notes</Text>
          {noteCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{noteCount}</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#6b7280"
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          {isLoading ? (
            <Text style={styles.loadingText}>Loading notes...</Text>
          ) : notes && notes.length > 0 ? (
            <View style={styles.notesList}>
              {notes.map((note) => {
                const icon = getNoteIcon(note.note_type);
                return (
                  <View key={note.id} style={styles.noteItem}>
                    <View style={styles.noteIconContainer}>
                      <Ionicons name={icon.name} size={16} color={icon.color} />
                    </View>
                    <View style={styles.noteContent}>
                      <Text style={styles.noteText}>
                        {getNoteDescription(note)}
                      </Text>
                      <View style={styles.noteMeta}>
                        <Text style={styles.noteAuthor}>
                          {note.created_by?.name || 'Unknown'}
                        </Text>
                        <Text style={styles.noteDot}>•</Text>
                        <Text style={styles.noteTimestamp}>
                          {formatNoteTimestamp(note.created_at)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyText}>No notes yet</Text>
          )}

          {!readOnly && !showAddNote ? (
            <TouchableOpacity
              style={styles.addNoteButton}
              onPress={() => setShowAddNote(true)}
            >
              <Ionicons name="add-circle-outline" size={18} color="#2563eb" />
              <Text style={styles.addNoteButtonText}>Add a note</Text>
            </TouchableOpacity>
          ) : !readOnly ? (
            <View style={styles.addNoteForm}>
              <TextInput
                style={styles.noteInput}
                placeholder="Enter your note..."
                value={noteText}
                onChangeText={setNoteText}
                multiline
                numberOfLines={3}
                maxLength={500}
                autoFocus
              />
              <View style={styles.addNoteActions}>
                <Button
                  title="Cancel"
                  onPress={() => {
                    setNoteText('');
                    setShowAddNote(false);
                  }}
                  variant="secondary"
                  size="small"
                  style={styles.cancelButton}
                />
                <Button
                  title="Save Note"
                  onPress={handleAddNote}
                  variant="primary"
                  size="small"
                  loading={createNoteMutation.isPending}
                  disabled={!noteText.trim() || createNoteMutation.isPending}
                  style={styles.saveButton}
                />
              </View>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  countBadge: {
    marginLeft: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    padding: 12,
    paddingTop: 0,
  },
  loadingText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 16,
    fontStyle: 'italic',
  },
  notesList: {
    marginBottom: 12,
  },
  noteItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  noteIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  noteContent: {
    flex: 1,
  },
  noteText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
    marginBottom: 4,
  },
  noteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteAuthor: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  noteDot: {
    fontSize: 12,
    color: '#d1d5db',
    marginHorizontal: 6,
  },
  noteTimestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  addNoteButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
    marginLeft: 6,
  },
  addNoteForm: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 8,
  },
  noteInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  addNoteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    marginRight: 8,
    paddingHorizontal: 16,
  },
  saveButton: {
    paddingHorizontal: 16,
  },
});
