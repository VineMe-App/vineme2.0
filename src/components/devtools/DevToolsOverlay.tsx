import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { devLogger } from '../../utils/devLogger';
import { globalErrorHandler } from '../../utils/globalErrorHandler';
import { useAuthStore } from '../../stores';
import { STORAGE_KEYS } from '../../utils/constants';
import { useSegments, useRouter } from 'expo-router';
import { QueryClient } from '@tanstack/react-query';

// QueryClient is created in QueryProvider; re-import where it is exported
import { queryClient } from '../../providers/QueryProvider';
import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import {
  getStoredPushToken,
  registerForPushNotifications,
} from '../../services/notifications';
import { buildInfo, describeBuild } from '../../devtools/buildInfo';

export function DevToolsOverlay() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<
    'build' | 'state' | 'logs' | 'errors' | 'queries' | 'notifs' | 'styles'
  >('build');
  const [tick, setTick] = useState(0);
  const segments = useSegments();
  const router = useRouter();
  const { user, userProfile, signOut } = useAuthStore();

  useEffect(() => {
    devLogger.attach();
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const logs = useMemo(() => devLogger.getLogs(200).reverse(), [tick]);
  const errors = useMemo(
    () => globalErrorHandler.getRecentErrors(50).reverse(),
    [tick]
  );
  const queries = useMemo(() => getQuerySummary(queryClient), [tick]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            setOpen(false);
          } catch (error) {
            console.error('Logout failed:', error);
          }
        },
      },
    ]);
  };

  if (!__DEV__) return null as any;

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={() => setOpen(true)}>
        <Text style={styles.fabText}>🐞</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.header}>
          <Text style={styles.title}>DevTools</Text>
          <View style={styles.tabs}>
            {([
              'build',
              'state',
              'logs',
              'errors',
              'queries',
              'notifs',
              'styles',
            ] as const).map(
              (t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTab(t)}
                  style={[styles.tab, tab === t && styles.tabActive]}
                >
                  <Text style={styles.tabText}>{t.toUpperCase()}</Text>
                </TouchableOpacity>
              )
            )}
          </View>
          <View style={styles.headerActions}>
            {user && (
              <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content}>
          {tab === 'build' && <BuildInfoPanel />}
          {tab === 'state' && <AppStatePanel segments={segments} />}
          {tab === 'logs' && (
            <View>
              {logs.map((l, i) => (
                <Text key={i} style={[styles.logLine, levelStyle(l.level)]}>
                  [{new Date(l.timestamp).toLocaleTimeString()}]{' '}
                  {l.level.toUpperCase()} {l.message}
                </Text>
              ))}
            </View>
          )}
          {tab === 'errors' && (
            <View>
              {errors.map((e, i) => (
                <View key={i} style={styles.errorBox}>
                  <Text style={styles.errorTitle}>{e.error.type}</Text>
                  <Text style={styles.errorMsg}>{e.error.message}</Text>
                  {e.context && (
                    <Text style={styles.errorCtx}>
                      {JSON.stringify(e.context)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
          {tab === 'queries' && (
            <View>
              {queries.map((q, i) => (
                <View key={i} style={styles.queryBox}>
                  <Text style={styles.queryKey}>{q.key}</Text>
                  <Text style={styles.queryMeta}>{q.meta}</Text>
                </View>
              ))}
            </View>
          )}
          {tab === 'notifs' && <NotificationsPanel />}
          {tab === 'styles' && <StyleGuidePanel router={router} onClose={() => setOpen(false)} />}
        </ScrollView>
      </Modal>
    </>
  );
}

function AppStatePanel({ segments }: { segments: string[] }) {
  const { user, userProfile } = useAuthStore();
  const state = {
    user: user?.id ? { id: user.id, email: user.email } : null,
    profile: userProfile?.id
      ? { id: userProfile.id, church_id: userProfile.church_id }
      : null,
    routeSegments: segments,
  };
  return (
    <View>
      <Text style={styles.sectionTitle}>App State</Text>
      <Text style={styles.mono}>{JSON.stringify(state, null, 2)}</Text>
    </View>
  );
}

function BuildInfoPanel() {
  return (
    <View>
      <Text style={styles.sectionTitle}>Bundle Revision</Text>
      <View style={styles.buildCard}>
        <Text style={styles.buildBadge}>Revision #{buildInfo.revision}</Text>
        <Text style={styles.buildSummary}>{buildInfo.summary}</Text>
        <Text style={styles.buildMeta}>
          Loaded: {buildInfo.timestampLocal} ({buildInfo.timestampIso})
        </Text>
        <Text style={styles.buildMeta}>Descriptor: {describeBuild()}</Text>
      </View>
      <Text style={styles.buildNote}>
        This counter increments whenever a new bundle loads. Update
        `src/devtools/buildInfo.ts` to tweak the summary or add extra notes so
        it&apos;s easy to confirm which change reached your device.
      </Text>
    </View>
  );
}

function getQuerySummary(qc: QueryClient) {
  const cache = qc.getQueryCache().getAll();
  return cache.map((q: any) => ({
    key: JSON.stringify(q.queryKey),
    meta: `status=${q.state.status} stale=${q.isStale()} observers=${q.getObserversCount?.() ?? 0}`,
  }));
}

function levelStyle(level: string) {
  switch (level) {
    case 'error':
      return { color: '#b00020' };
    case 'warn':
      return { color: '#a56a00' };
    case 'info':
      return { color: '#0b72b9' };
    default:
      return { color: '#333' };
  }
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 28,
    backgroundColor: '#111827',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  fabText: { color: 'white', fontSize: 20 },
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#111827',
  },
  title: { color: 'white', fontSize: 18, fontWeight: '700' },
  tabs: { flexDirection: 'row', marginTop: 8 },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    borderRadius: 6,
    backgroundColor: '#374151',
  },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { color: 'white', fontSize: 12 },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },
  logoutText: { color: 'white', fontSize: 12 },
  closeBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  closeText: { color: 'white', fontSize: 14 },
  content: { padding: 12, backgroundColor: '#f9fafb' },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  mono: { fontFamily: 'monospace' },
  logLine: { fontSize: 12, marginBottom: 4 },
  buildCard: {
    backgroundColor: '#fff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  buildBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    color: '#fff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  buildSummary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  buildMeta: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  buildNote: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#fff0f0',
    borderColor: '#ffccd1',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  errorTitle: { color: '#b00020', fontWeight: '700' },
  errorMsg: { color: '#b00020' },
  errorCtx: { color: '#7f1d1d', fontFamily: 'monospace', fontSize: 11 },
  queryBox: {
    backgroundColor: '#fff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  queryKey: { fontFamily: 'monospace', fontSize: 12, marginBottom: 4 },
  queryMeta: { color: '#111827', fontSize: 12 },
  styleGuideCard: {
    backgroundColor: '#fff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  styleGuideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  styleGuideIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  styleGuideTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  styleGuideDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  styleGuidePath: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  quickActionsSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionBtn: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    minWidth: 80,
    flex: 1,
  },
  quickActionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '500',
  },
});

function StyleGuidePanel({ router, onClose }: { router: any; onClose: () => void }) {
  const navigateToStyleGuide = (path: string) => {
    onClose();
    router.push(path);
  };

  const styleGuidePages = [
    {
      title: 'Complete Style Guide',
      description: 'Full component showcase with all variants and states',
      path: '/styling-system-example',
      icon: '🎨',
    },
    {
      title: 'Simple Style Guide',
      description: 'Basic component examples and usage patterns',
      path: '/styling-system-example-simple',
      icon: '📝',
    },
    {
      title: 'Interactive Demo',
      description: 'Interactive theme switching and component testing',
      path: '/styling-system-demo',
      icon: '🔧',
    },
    {
      title: 'Performance Demo',
      description: 'Performance monitoring and optimization tools',
      path: '/styling-system-performance-demo',
      icon: '⚡',
    },
  ];

  return (
    <View>
      <Text style={styles.sectionTitle}>Style Guide & Design System</Text>
      <Text style={{ marginBottom: 16, color: '#6b7280', fontSize: 14 }}>
        Navigate to different style guide pages to test and develop components
      </Text>
      
      {styleGuidePages.map((page, index) => (
        <TouchableOpacity
          key={index}
          style={styles.styleGuideCard}
          onPress={() => navigateToStyleGuide(page.path)}
        >
          <View style={styles.styleGuideCardHeader}>
            <Text style={styles.styleGuideIcon}>{page.icon}</Text>
            <Text style={styles.styleGuideTitle}>{page.title}</Text>
          </View>
          <Text style={styles.styleGuideDescription}>{page.description}</Text>
          <Text style={styles.styleGuidePath}>{page.path}</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.quickActionsSection}>
        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>
          Quick Actions
        </Text>
        
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => {
              // Open the styling system README
              console.log('📖 Styling System Guide: src/theme/README.md');
              console.log('📖 Quick Reference: src/theme/QUICK_REFERENCE.md');
              console.log('📖 Component Examples: src/components/ui/__examples__/');
            }}
          >
            <Text style={styles.quickActionIcon}>📖</Text>
            <Text style={styles.quickActionText}>Docs</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => {
              // Log current theme info
              console.log('🎨 Theme tokens location: src/theme/tokens/');
              console.log('🎨 Theme configuration: src/theme/themes/');
            }}
          >
            <Text style={styles.quickActionIcon}>🎨</Text>
            <Text style={styles.quickActionText}>Theme Info</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => {
              // Log component locations
              console.log('🧩 UI Components: src/components/ui/');
              console.log('🧩 Component examples: src/components/ui/__examples__/');
            }}
          >
            <Text style={styles.quickActionIcon}>🧩</Text>
            <Text style={styles.quickActionText}>Components</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => {
              // Log testing info
              console.log('🧪 Style tests: src/__tests__/styling-system/');
              console.log('🧪 Run tests: npm run test:styling-system');
            }}
          >
            <Text style={styles.quickActionIcon}>🧪</Text>
            <Text style={styles.quickActionText}>Tests</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function NotificationsPanel() {
  const [permission, setPermission] = useState<
    'granted' | 'denied' | 'undetermined'
  >('undetermined');
  const [token, setToken] = useState<string | null>(null);
  const { user } = useAuthStore();
  const projectId =
    (Constants?.expoConfig as any)?.extra?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId;
  const fcmConfigured = Boolean(
    (Constants as any)?.expoConfig?.android?.googleServicesFile ||
      (Constants as any)?.android?.googleServicesFile
  );
  const appOwnership = (Constants as any)?.appOwnership;

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) =>
      setPermission(status)
    );
    getStoredPushToken().then(setToken);
  }, []);

  const requestPerms = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermission(status);
  };

  const fetchToken = async () => {
    try {
      if (!user?.id) {
        console.warn('No user signed in');
        return;
      }
      await registerForPushNotifications(user.id);
      const t = await getStoredPushToken();
      setToken(t);
    } catch (e) {
      console.warn('Token fetch error:', e);
    }
  };

  const scheduleLocal = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Test Notification', body: 'This is a local test.' },
        trigger: null,
      });
    } catch (e) {
      console.warn('Local notification error:', e);
    }
  };

  const sendExpoTest = async () => {
    try {
      const t = token || (await getStoredPushToken());
      if (!t) {
        console.warn('No Expo push token available. Fetch token first.');
        return;
      }
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: t,
          title: 'Expo Test Notification',
          body: 'Hello from the DevTools overlay 👋',
        }),
      });
      const json = await res.json();
      console.log('[Notifications] Expo push response:', json);
    } catch (e) {
      console.warn('Expo push send error:', e);
    }
  };

  return (
    <View>
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>
        Permissions: {permission}
      </Text>
      <Text style={{ marginBottom: 6 }}>
        Platform: {Platform.OS} | Device:{' '}
        {Device.isDevice ? 'physical' : 'emulator'}
      </Text>
      <Text style={{ marginBottom: 6 }}>
        App Ownership: {String(appOwnership || 'standalone')}
      </Text>
      <Text style={{ marginBottom: 6 }}>
        Expo Project ID: {String(projectId || '(none)')}
      </Text>
      <Text style={{ marginBottom: 6 }}>
        FCM Configured: {fcmConfigured ? 'yes' : 'no'}
      </Text>
      <Text selectable style={{ fontFamily: 'monospace', marginBottom: 8 }}>
        Expo Token: {token || '(none)'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          style={[styles.tab, styles.tabActive]}
          onPress={requestPerms}
        >
          <Text style={styles.tabText}>Request Permissions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, styles.tabActive]}
          onPress={fetchToken}
        >
          <Text style={styles.tabText}>Get Token</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, styles.tabActive]}
          onPress={scheduleLocal}
        >
          <Text style={styles.tabText}>Local Test</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, styles.tabActive]}
          onPress={sendExpoTest}
        >
          <Text style={styles.tabText}>Send Expo Test</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, styles.tabActive]}
          onPress={() =>
            Notifications.getDevicePushTokenAsync()
              .then((t) =>
                console.log('[Notifications] Native device token:', t)
              )
              .catch((e) => console.warn('Device token error:', e))
          }
        >
          <Text style={styles.tabText}>Native Token</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, styles.tabActive]}
          onPress={() => Linking.openSettings().catch(() => {})}
        >
          <Text style={styles.tabText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ marginTop: 10, color: '#6b7280' }}>
        Note: On Android, a dev client built with google-services.json is
        required for Expo push tokens. If using Expo Go or a build without FCM,
        token will be unavailable.
      </Text>
    </View>
  );
}
