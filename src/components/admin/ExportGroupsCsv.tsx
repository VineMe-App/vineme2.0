import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { ChurchAdminOnly } from '@/components/ui/RoleBasedRender';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth';
import { useTheme } from '@/theme/provider/useTheme';
import { saveTextFiles, type TextFile } from '@/utils/saveTextFiles';

type ExportMode = 'download' | 'email';

interface ExportResponse {
  ok: boolean;
  error?: string;
  files?: TextFile[];
  sent_to?: string;
}

/**
 * Exports the church's approved groups and their active members as CSVs for manual
 * import into ChurchSuite (see supabase/functions/export-groups-csv). Admins can either
 * save the files to this device or have them emailed to their own address.
 */
export const ExportGroupsCsv: React.FC = () => {
  const { userProfile } = useAuthStore();
  const { theme } = useTheme();
  const [pendingMode, setPendingMode] = useState<ExportMode | null>(null);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const runExport = async (mode: ExportMode) => {
    if (!userProfile?.church_id) return;

    setPendingMode(mode);
    setStatus(null);
    try {
      const { data, error } = await supabase.functions.invoke<ExportResponse>(
        'export-groups-csv',
        { body: { church_id: userProfile.church_id, mode } }
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Export failed.');

      if (mode === 'email') {
        setStatus({
          type: 'success',
          message: `Export emailed to ${data.sent_to}.`,
        });
        return;
      }

      const saved = await saveTextFiles(data.files ?? []);
      if (saved) {
        setStatus({ type: 'success', message: 'Export saved to your device.' });
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Could not export groups.',
      });
    } finally {
      setPendingMode(null);
    }
  };

  return (
    <ChurchAdminOnly>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface.primary,
            borderColor: theme.colors.border.primary,
          },
        ]}
      >
        <Text style={styles.title}>Export groups for ChurchSuite</Text>
        <Text color="secondary" variant="bodySmall">
          Exports approved groups (in ChurchSuite&apos;s import format) and
          their members as CSV files.
        </Text>
        <View style={styles.actions}>
          <Button
            title="Download CSV"
            variant="primary"
            size="small"
            onPress={() => runExport('download')}
            loading={pendingMode === 'download'}
            disabled={pendingMode !== null}
          />
          <Button
            title="Email CSV to me"
            variant="outline"
            size="small"
            onPress={() => runExport('email')}
            loading={pendingMode === 'email'}
            disabled={pendingMode !== null}
          />
        </View>
        {status ? (
          <Text
            variant="bodySmall"
            color={status.type === 'error' ? 'error' : 'secondary'}
          >
            {status.message}
          </Text>
        ) : null}
      </View>
    </ChurchAdminOnly>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
});
