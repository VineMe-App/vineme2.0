import { Alert, StyleSheet, TextInputChangeEvent } from 'react-native';
import {
  Button,
  ChurchAdminOnly,
  Form,
  FormConfig,
  FormField,
  Input,
  useFormContext,
} from '@/components';
import { AdminPageLayout } from '@/components/admin/AdminHeader';
import Text from '@/components/ui/Text';
import { View } from 'react-native';
import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth';
import { useTheme } from '@/theme/provider/useTheme';
import { formatDateTime } from '@/utils/helpers';
import { useFeatureFlag } from '@/hooks';

const SubmitButton: React.FC<{
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  isSubmitting: boolean;
}> = ({ onSubmit, isSubmitting }) => {
  const { validateForm, values } = useFormContext();
  const handlePress = useCallback(() => {
    const ok = validateForm();
    if (!ok) return;
    onSubmit(values);
  }, [validateForm, values, onSubmit]);

  return (
    <Button
      onPress={handlePress}
      disabled={isSubmitting}
      loading={isSubmitting}
      title={isSubmitting ? 'Saving...' : 'Save'}
    />
  );
};

const ChurchsuiteAdminScreen = () => {
  const { userProfile } = useAuthStore();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isFeatureEnabled: isChurchsuiteEnabled } = useFeatureFlag('churchsuite');

  const connectionQueryKey = ['churchsuite-connection', userProfile?.church_id];

  const { data: existingConnection, isLoading: isLoadingConnection } = useQuery(
    {
      queryKey: connectionQueryKey,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('churchsuite_connections')
          .select('id, is_active, created_at')
          .eq('church_id', userProfile!.church_id)
          .maybeSingle();

        if (error) throw error;
        return data;
      },
      enabled: !!userProfile?.church_id,
    }
  );

  const formConfig: FormConfig = {
    secret: {
      rules: {
        required: true,
      },
      initialValue: '',
    },
    clientId: {
      rules: {
        required: true,
      },
    },
  };

  const handleSubmit = async (values: {
    clientId: TextInputChangeEvent['nativeEvent'];
    secret: TextInputChangeEvent['nativeEvent'];
  }) => {
    const { text: clientId } = values.clientId;
    const { text: secret } = values.secret;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('create_churchsuite_connection', {
        p_identifier: clientId,
        p_secret: secret,
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: connectionQueryKey });
    } catch (err) {
      console.log(err);
      Alert.alert(
        'Something went wrong',
        err instanceof Error
          ? err.message
          : 'Could not save the ChurchSuite connection.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  return isChurchsuiteEnabled ? (
    <ChurchAdminOnly>
      <AdminPageLayout
        title="ChurchSuite connection"
        subtitle="View ChurchSuite connection settings"
      >
        <View style={styles.container}>
          <Text color="secondary" style={styles.intro}>
            Here you can connect your ChurchSuite account.
          </Text>
          {isLoadingConnection ? null : existingConnection ? (
            <View
              style={[
                styles.notice,
                {
                  backgroundColor: theme.colors.info[50],
                  borderColor: theme.colors.info[200],
                },
              ]}
            >
              <Text style={{ color: theme.colors.info[700] }}>
                A ChurchSuite connection was added on{' '}
                {formatDateTime(existingConnection.created_at)}. To protect the
                existing credentials, they can't be viewed or overwritten here.
                Contact support if you need to change them.
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface.primary,
                  borderColor: theme.colors.border.primary,
                },
              ]}
            >
              <Form
                config={formConfig}
                onSubmit={handleSubmit}
                style={styles.form}
              >
                <FormField name="clientId">
                  {({ value, error, onChange, onBlur }) => (
                    <Input
                      label="Client ID"
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                      error={error}
                      containerStyle={styles.field}
                    />
                  )}
                </FormField>
                <FormField name="secret">
                  {({ value, error, onChange, onBlur }) => (
                    <Input
                      label="Client Secret"
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                      error={error}
                      containerStyle={styles.field}
                    />
                  )}
                </FormField>
                <SubmitButton
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                />
              </Form>
            </View>
          )}
        </View>
      </AdminPageLayout>
    </ChurchAdminOnly>
  ) : null;
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  intro: {
    marginBottom: 0,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
  },
  form: {
    gap: 16,
  },
  field: {
    marginBottom: 0,
  },
  notice: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
});

export default ChurchsuiteAdminScreen;
