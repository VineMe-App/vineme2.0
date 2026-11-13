import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../stores/auth';
import {
  fetchDevUsers,
  impersonateUser,
  type DevUserItem,
} from '../../services/devImpersonate';

interface DevUsersPanelProps {
  onSuccess?: () => void;
}

export function DevUsersPanel({ onSuccess }: DevUsersPanelProps) {
  const { user: currentUser, userProfile } = useAuthStore();
  const [users, setUsers] = useState<DevUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [switchingUserId, setSwitchingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<
    'all' | 'admin' | 'leader' | 'newcomer'
  >('all');
  const [manualId, setManualId] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadUsers = useCallback(async (query?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchDevUsers(query);
      setUsers(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSwitch = async (userId: string, displayName?: string | null) => {
    if (userId === currentUser?.id) {
      Alert.alert('Notice', 'You are already logged in as this user.');
      return;
    }

    setSwitchingUserId(userId);
    const result = await impersonateUser(userId);
    setSwitchingUserId(null);

    if (result.success) {
      const name = displayName || result.profile?.name || userId.slice(0, 8);
      Alert.alert('Success', `Switched to user: ${name}`, [
        { text: 'OK', onPress: onSuccess },
      ]);
    } else {
      Alert.alert(
        'Login Failed',
        result.error || 'Could not log in as this user'
      );
    }
  };

  const handleManualLogin = async () => {
    if (!manualId.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid User ID.');
      return;
    }

    setManualLoading(true);
    const result = await impersonateUser(manualId.trim());
    setManualLoading(false);

    if (result.success) {
      const name = result.profile?.name || manualId.slice(0, 8);
      setManualId('');
      Alert.alert('Success', `Switched to user: ${name}`, [
        { text: 'OK', onPress: onSuccess },
      ]);
    } else {
      Alert.alert(
        'Login Failed',
        result.error || 'Could not log in with this User ID'
      );
    }
  };

  const filteredUsers = useMemo(() => {
    let list = users;

    if (roleFilter === 'admin') {
      list = list.filter((u) => u.roles?.includes('church_admin'));
    } else if (roleFilter === 'leader') {
      list = list.filter(
        (u) => u.roles?.includes('group_leader') || u.roles?.includes('leader')
      );
    } else if (roleFilter === 'newcomer') {
      list = list.filter((u) => u.newcomer);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.first_name?.toLowerCase().includes(q) ||
          u.last_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q) ||
          u.church?.name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [users, roleFilter, search]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dev User Switcher</Text>
      <Text style={styles.subtitle}>
        Instantly log in as any user in the database without receiving an SMS
        code.
      </Text>

      {/* Current User Card */}
      <View style={styles.currentCard}>
        <Text style={styles.currentCardTitle}>Currently Authenticated</Text>
        {currentUser ? (
          <View style={styles.currentUserInfo}>
            <Text style={styles.currentUserName}>
              {userProfile?.name ||
                `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() ||
                'Unnamed User'}
            </Text>
            <Text style={styles.currentUserMeta}>
              ID: <Text style={styles.mono}>{currentUser.id}</Text>
            </Text>
            {userProfile?.church?.name && (
              <Text style={styles.currentUserMeta}>
                Church: {userProfile.church.name}
              </Text>
            )}
            <View style={styles.badgeRow}>
              {(userProfile?.roles || ['user']).map((role, idx) => (
                <View key={idx} style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{role}</Text>
                </View>
              ))}
              {userProfile?.newcomer && (
                <View style={[styles.roleBadge, styles.newcomerBadge]}>
                  <Text style={styles.newcomerBadgeText}>Newcomer</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <Text style={styles.notLoggedIn}>Not currently logged in</Text>
        )}
      </View>

      {/* Manual ID Input */}
      <View style={styles.manualBox}>
        <Text style={styles.manualLabel}>
          Log in with custom User ID (UUID)
        </Text>
        <View style={styles.manualRow}>
          <TextInput
            style={styles.manualInput}
            placeholder="Paste Supabase auth user UUID..."
            placeholderTextColor="#9ca3af"
            value={manualId}
            onChangeText={setManualId}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.manualBtn, manualLoading && styles.disabledBtn]}
            onPress={handleManualLogin}
            disabled={manualLoading}
          >
            {manualLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.manualBtnText}>Switch</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search & Filters */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, phone, role, or ID..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.filtersRow}>
          {(['all', 'admin', 'leader', 'newcomer'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                roleFilter === filter && styles.filterChipActive,
              ]}
              onPress={() => setRoleFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  roleFilter === filter && styles.filterChipTextActive,
                ]}
              >
                {filter.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => loadUsers(search)}
          >
            <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error state */}
      {errorMsg && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Loading state */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading database users...</Text>
        </View>
      ) : (
        <View style={styles.userList}>
          <Text style={styles.listHeader}>
            Found {filteredUsers.length} user
            {filteredUsers.length === 1 ? '' : 's'}
          </Text>

          {filteredUsers.map((item) => {
            const isCurrent = item.id === currentUser?.id;
            const isSwitching = switchingUserId === item.id;
            const displayName =
              item.name ||
              `${item.first_name || ''} ${item.last_name || ''}`.trim() ||
              'Unnamed User';

            return (
              <View
                key={item.id}
                style={[styles.userCard, isCurrent && styles.activeUserCard]}
              >
                <View style={styles.userCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName}>{displayName}</Text>
                      {isCurrent && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Active</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.monoId}>{item.id}</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.switchBtn,
                      isCurrent && styles.switchBtnDisabled,
                      isSwitching && styles.disabledBtn,
                    ]}
                    onPress={() => handleSwitch(item.id, displayName)}
                    disabled={isCurrent || isSwitching}
                  >
                    {isSwitching ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.switchBtnText}>
                        {isCurrent ? 'Current' : '⚡ Switch'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Badges */}
                <View style={styles.badgeRow}>
                  {(item.roles || ['user']).map((r, i) => (
                    <View
                      key={i}
                      style={[
                        styles.roleBadge,
                        r === 'church_admin'
                          ? styles.adminBadge
                          : r.includes('leader')
                            ? styles.leaderBadge
                            : null,
                      ]}
                    >
                      <Text style={styles.roleBadgeText}>{r}</Text>
                    </View>
                  ))}
                  {item.newcomer && (
                    <View style={[styles.roleBadge, styles.newcomerBadge]}>
                      <Text style={styles.newcomerBadgeText}>Newcomer</Text>
                    </View>
                  )}
                </View>

                {/* Metadata */}
                <View style={styles.userMetaSection}>
                  {(item.email || item.phone) && (
                    <Text style={styles.metaRow}>
                      {item.email ? `✉️ ${item.email}` : ''}
                      {item.email && item.phone ? '  •  ' : ''}
                      {item.phone ? `📱 ${item.phone}` : ''}
                    </Text>
                  )}
                  {item.church?.name && (
                    <Text style={styles.metaRow}>
                      ⛪ {item.church.name}
                      {item.service?.name ? ` (${item.service.name})` : ''}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {filteredUsers.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No users matched your query.</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  title: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  currentCard: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  currentCardTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  currentUserInfo: {
    gap: 4,
  },
  currentUserName: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '700',
  },
  currentUserMeta: {
    color: '#d1d5db',
    fontSize: 13,
  },
  notLoggedIn: {
    color: '#ef4444',
    fontSize: 14,
    fontStyle: 'italic',
  },
  mono: {
    fontFamily: 'monospace',
    color: '#a78bfa',
    fontSize: 12,
  },
  manualBox: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  manualLabel: {
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 6,
    color: 'white',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  manualBtn: {
    backgroundColor: '#8b5cf6',
    borderRadius: 6,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  searchSection: {
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  filterChip: {
    backgroundColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
  },
  filterChipText: {
    color: '#d1d5db',
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: 'white',
  },
  refreshBtn: {
    marginLeft: 'auto',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  refreshBtnText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderColor: '#991b1b',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
  },
  loader: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  userList: {
    gap: 10,
  },
  listHeader: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  userCard: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  activeUserCard: {
    borderColor: '#2563eb',
    backgroundColor: '#1e293b',
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    color: '#f9fafb',
    fontSize: 15,
    fontWeight: '600',
  },
  currentBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  monoId: {
    fontFamily: 'monospace',
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 2,
  },
  switchBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  switchBtnDisabled: {
    backgroundColor: '#4b5563',
    opacity: 0.6,
  },
  switchBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  roleBadge: {
    backgroundColor: '#4b5563',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadge: {
    backgroundColor: '#dc2626',
  },
  leaderBadge: {
    backgroundColor: '#059669',
  },
  newcomerBadge: {
    backgroundColor: '#d97706',
  },
  roleBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
  },
  newcomerBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
  },
  userMetaSection: {
    gap: 3,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 6,
  },
  metaRow: {
    color: '#9ca3af',
    fontSize: 12,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
  },
});
