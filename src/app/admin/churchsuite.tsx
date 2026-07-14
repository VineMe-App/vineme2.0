import { StyleSheet, TextInputChangeEvent } from 'react-native';
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
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth';
import { useTheme } from '@/theme/provider/useTheme';
import { formatDateTime } from '@/utils/helpers';

const SubmitButton: React.FC<{
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
}> = ({ onSubmit }) => {
  const { validateForm, values, isSubmitting } = useFormContext();
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

  const { data: existingConnection, isLoading: isLoadingConnection } =
    useQuery({
      queryKey: ['churchsuite-connection', userProfile?.church_id],
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
    });

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

    const { data, error } = await supabase.functions.invoke(
      'store-churchsuite-connection',
      {
        body: {
          church_id: userProfile?.church_id,
          client_id: clientId,
          client_secret: secret,
        },
      }
    );
    console.log(data, error);
  };
  return (
    <ChurchAdminOnly>
      <AdminPageLayout
        title="ChurchSuite connection"
        subtitle="View ChurchSuite connection settings"
      >
        <View style={styles.container}>
          <Text>Here you can connect your ChurchSuite account.</Text>
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
                {formatDateTime(existingConnection.created_at)}. To protect
                the existing credentials, they can't be viewed or overwritten
                here. Contact support if you need to change them.
              </Text>
            </View>
          ) : (
            <Form config={formConfig} onSubmit={handleSubmit}>
              <FormField name="clientId">
                {({ value, error, onChange, onBlur }) => (
                  <Input
                    label="Client ID"
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    error={error}
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
                  />
                )}
              </FormField>
              <SubmitButton onSubmit={handleSubmit} />
            </Form>
          )}
        </View>
      </AdminPageLayout>
    </ChurchAdminOnly>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  notice: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
});

export default ChurchsuiteAdminScreen;
