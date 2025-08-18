import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { devLogger } from '../../utils/devLogger';
import { globalErrorHandler } from '../../utils/globalErrorHandler';
import { useAuthStore } from '../../stores';
import { STORAGE_KEYS } from '../../utils/constants';
import { useSegments } from 'expo-router';
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

export function DevToolsOverlay() {
  if (!__DEV__) return null as any;

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<
    'state' | 'logs' | 'errors' | 'queries' | 'notifs'
  >('state');
  const [tick, setTick] = useState(0);
  const segments = useSegments();
  const { user, userProfile } = useAuthStore();

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
            {(['state', 'logs', 'errors', 'queries', 'notifs'] as const).map(
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
          <TouchableOpacity
            onPress={() => setOpen(false)}
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
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
  closeBtn: { position: 'absolute', right: 16, top: 48 },
  closeText: { color: 'white', fontSize: 14 },
  content: { padding: 12, backgroundColor: '#f9fafb' },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  mono: { fontFamily: 'monospace' },
  logLine: { fontSize: 12, marginBottom: 4 },
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
});

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
