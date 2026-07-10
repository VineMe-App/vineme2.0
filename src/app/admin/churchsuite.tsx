import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminPageLayout } from '@/components/admin/AdminHeader';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import {
  ChurchSuiteContact,
  ChurchSuiteMockService,
} from '@/services/churchsuiteMock';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth';

const DEFAULT_MOCK_URL =
  process.env.EXPO_PUBLIC_CHURCHSUITE_MOCK_URL || 'http://127.0.0.1:8030';
const MOCK_API_KEY = process.env.EXPO_PUBLIC_CHURCHSUITE_MOCK_API_KEY;

const scenarioOptions = [
  'normal',
  'unauthorized',
  'malformed',
  'timeout',
  'server-down',
] as const;

type Scenario = (typeof scenarioOptions)[number];

interface ChurchSuiteLinkRow {
  id: string;
  user_id: string;
  churchsuite_contact_id?: string | null;
  match_status: string;
  match_reason?: string | null;
  matched_by?: string[] | null;
  last_error?: string | null;
  updated_at?: string | null;
}

function ContactCard({
  contact,
  onToggleVulnerable,
  isUpdating,
}: {
  contact: ChurchSuiteContact;
  onToggleVulnerable: (contact: ChurchSuiteContact) => void;
  isUpdating: boolean;
}) {
  const isVulnerable = Boolean(contact.custom_fields?.vulnerable);

  return (
    <View style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <View style={styles.contactTitleGroup}>
          <Text style={styles.contactName}>{contact.name || 'Unnamed contact'}</Text>
          <Text style={styles.contactId}>{contact.id}</Text>
        </View>
        <View
          style={[
            styles.statusPill,
            isVulnerable ? styles.warningPill : styles.neutralPill,
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              isVulnerable ? styles.warningPillText : styles.neutralPillText,
            ]}
          >
            {isVulnerable ? 'Vulnerable' : 'Not vulnerable'}
          </Text>
        </View>
      </View>

      <View style={styles.contactDetails}>
        <Text style={styles.detailText}>Email: {contact.email || 'None'}</Text>
        <Text style={styles.detailText}>Mobile: {contact.mobile || 'None'}</Text>
        <Text style={styles.detailText}>Status: {contact.status}</Text>
      </View>

      <Button
        title={isVulnerable ? 'Clear vulnerable flag' : 'Mark vulnerable'}
        variant={isVulnerable ? 'outline' : 'warning'}
        size="small"
        loading={isUpdating}
        onPress={() => onToggleVulnerable(contact)}
      />
    </View>
  );
}

export default function ChurchSuiteAdminScreen() {
  const { userProfile } = useAuthStore();
  const [mockUrl, setMockUrl] = useState(DEFAULT_MOCK_URL);
  const [query, setQuery] = useState('grace.taylor@example.com');
  const [scenario, setScenario] = useState<Scenario>('normal');
  const [contacts, setContacts] = useState<ChurchSuiteContact[]>([]);
  const [linkRows, setLinkRows] = useState<ChurchSuiteLinkRow[]>([]);
  const [status, setStatus] = useState<string>('Not checked yet');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingContactId, setUpdatingContactId] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({
    first_name: 'New',
    last_name: 'Person',
    email: 'new.person@example.com',
    mobile: '07700 900 606',
  });

  const churchSuite = useMemo(
    () => new ChurchSuiteMockService(mockUrl, MOCK_API_KEY),
    [mockUrl]
  );

  const handleHealthCheck = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await churchSuite.health();
      setStatus(
        `Mock online: ${result.contacts} contacts, scenario "${result.scenario}"`
      );
    } catch (err) {
      setStatus('Mock offline');
      setError(err instanceof Error ? err.message : 'Health check failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await churchSuite.searchContacts(query, scenario);
      setContacts(result.data);
      setStatus(`Search returned ${result.meta?.count ?? result.data.length} contact(s)`);
    } catch (err) {
      setContacts([]);
      setStatus('Search failed');
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await churchSuite.createContact(newContact);
      setContacts([result.data]);
      setQuery(result.data.email);
      setStatus(`Created ${result.data.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create contact failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVulnerable = async (contact: ChurchSuiteContact) => {
    setUpdatingContactId(contact.id);
    setError(null);
    try {
      const nextValue = !contact.custom_fields?.vulnerable;
      const result = await churchSuite.updateVulnerableFlag(contact.id, nextValue);
      setContacts((current) =>
        current.map((item) => (item.id === contact.id ? result.data : item))
      );
      setStatus(
        `${result.data.name} is now ${
          result.data.custom_fields?.vulnerable ? 'vulnerable' : 'not vulnerable'
        }`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdatingContactId(null);
    }
  };

  const handleLoadLinkStatuses = async () => {
    if (!userProfile?.church_id) {
      setError('No church ID found for current admin');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: linkError } = await supabase
        .from('churchsuite_contact_links')
        .select(
          'id, user_id, churchsuite_contact_id, match_status, match_reason, matched_by, last_error, updated_at'
        )
        .eq('church_id', userProfile.church_id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (linkError) {
        throw new Error(linkError.message);
      }

      setLinkRows((data || []) as ChurchSuiteLinkRow[]);
      setStatus(`Loaded ${(data || []).length} ChurchSuite link status row(s)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load link statuses');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminPageLayout
      title="ChurchSuite"
      subtitle="Local mock integration"
      breadcrumbs={[
        { label: 'Admin', route: '/admin' },
        { label: 'ChurchSuite' },
      ]}
      onRefresh={handleSearch}
      isRefreshing={isLoading}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection</Text>
          <Text style={styles.helpText}>
            This page talks to the local ChurchSuite mock. For a physical phone,
            replace 127.0.0.1 with your Mac&apos;s LAN IP.
          </Text>
          <TextInput
            value={mockUrl}
            onChangeText={setMockUrl}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            placeholder="http://127.0.0.1:8030"
          />
          <View style={styles.row}>
            <Button
              title="Check mock"
              onPress={handleHealthCheck}
              loading={isLoading}
              size="small"
              variant="primary"
            />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search contacts</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            placeholder="email, phone, or name"
          />
          <View style={styles.scenarioList}>
            {scenarioOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.scenarioButton,
                  scenario === option && styles.scenarioButtonActive,
                ]}
                onPress={() => setScenario(option)}
              >
                <Text
                  style={[
                    styles.scenarioButtonText,
                    scenario === option && styles.scenarioButtonTextActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button
            title="Search ChurchSuite mock"
            onPress={handleSearch}
            loading={isLoading}
            variant="primary"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create test contact</Text>
          <View style={styles.twoColumn}>
            <TextInput
              value={newContact.first_name}
              onChangeText={(first_name) =>
                setNewContact((current) => ({ ...current, first_name }))
              }
              style={[styles.input, styles.halfInput]}
              placeholder="First name"
            />
            <TextInput
              value={newContact.last_name}
              onChangeText={(last_name) =>
                setNewContact((current) => ({ ...current, last_name }))
              }
              style={[styles.input, styles.halfInput]}
              placeholder="Last name"
            />
          </View>
          <TextInput
            value={newContact.email}
            onChangeText={(email) =>
              setNewContact((current) => ({ ...current, email }))
            }
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={styles.input}
            placeholder="Email"
          />
          <TextInput
            value={newContact.mobile}
            onChangeText={(mobile) =>
              setNewContact((current) => ({ ...current, mobile }))
            }
            keyboardType="phone-pad"
            style={styles.input}
            placeholder="Mobile"
          />
          <Button
            title="Create in mock"
            onPress={handleCreate}
            loading={isLoading}
            variant="secondary"
          />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={18} color="#b91c1c" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VineMe link status</Text>
          <Text style={styles.helpText}>
            This reads the Supabase link table. Ambiguous matches should appear
            as manual_review for pastoral/admin follow-up.
          </Text>
          <Button
            title="Load link statuses"
            onPress={handleLoadLinkStatuses}
            loading={isLoading}
            variant="secondary"
          />
          {linkRows.map((row) => (
            <View key={row.id} style={styles.linkStatusCard}>
              <View style={styles.contactHeader}>
                <View style={styles.contactTitleGroup}>
                  <Text style={styles.contactName}>{row.match_status}</Text>
                  <Text style={styles.contactId}>User: {row.user_id}</Text>
                </View>
                <View style={[styles.statusPill, styles.neutralPill]}>
                  <Text style={styles.neutralPillText}>
                    {row.churchsuite_contact_id || 'No contact linked'}
                  </Text>
                </View>
              </View>
              <Text style={styles.detailText}>
                Reason: {row.match_reason || 'No reason recorded'}
              </Text>
              <Text style={styles.detailText}>
                Matched by: {(row.matched_by || []).join(', ') || 'None'}
              </Text>
              {row.last_error ? (
                <Text style={styles.errorText}>Last error: {row.last_error}</Text>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Results</Text>
          {isLoading && contacts.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
              <Text style={styles.helpText}>Loading ChurchSuite mock...</Text>
            </View>
          ) : contacts.length > 0 ? (
            contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                isUpdating={updatingContactId === contact.id}
                onToggleVulnerable={handleToggleVulnerable}
              />
            ))
          ) : (
            <Text style={styles.helpText}>
              No contacts loaded yet. Try searching for grace.taylor@example.com,
              shared@example.com, or sam.morgan@example.com.
            </Text>
          )}
        </View>
      </ScrollView>
    </AdminPageLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  statusText: {
    flex: 1,
    color: '#374151',
    fontSize: 13,
  },
  scenarioList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  scenarioButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  scenarioButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  scenarioButtonText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  scenarioButtonTextActive: {
    color: '#fff',
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#991b1b',
    flex: 1,
    fontSize: 13,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  linkStatusCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    backgroundColor: '#f9fafb',
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  contactTitleGroup: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  contactId: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  contactDetails: {
    gap: 4,
    marginBottom: 12,
  },
  detailText: {
    color: '#374151',
    fontSize: 13,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  warningPill: {
    backgroundColor: '#fef3c7',
  },
  neutralPill: {
    backgroundColor: '#e5e7eb',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  warningPillText: {
    color: '#92400e',
  },
  neutralPillText: {
    color: '#374151',
  },
});
