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
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth';

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
      title={isSubmitting ? 'Submitting...' : 'Submit referral'}
    />
  );
};

const ChurchsuiteAdminScreen = () => {
  const { userProfile } = useAuthStore();

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
  };
  return (
    <ChurchAdminOnly>
      <AdminPageLayout
        title="ChurchSuite connection"
        subtitle="View ChurchSuite connection settings"
      >
        <View style={styles.container}>
          <Text>Here you can connect your ChurchSuite account.</Text>
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
        </View>
      </AdminPageLayout>
    </ChurchAdminOnly>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
});

export default ChurchsuiteAdminScreen;
