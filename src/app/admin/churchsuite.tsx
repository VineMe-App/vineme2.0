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
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Select, SelectOption } from '@/components/ui/Select';
import { View } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth';
import { useTheme } from '@/theme/provider/useTheme';
import { formatDateTime, formatTime } from '@/utils/helpers';
import { useFeatureFlag } from '@/hooks';

interface ServiceListItem {
  id: string;
  name: string;
  day_of_week: string;
  start_time: string;
  churchsuite_site_id: string | null;
}

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { isFeatureEnabled: isChurchsuiteEnabled } =
    useFeatureFlag('churchsuite');

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

  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ['church-services', userProfile?.church_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, day_of_week, start_time, churchsuite_site_id')
        .eq('church_id', userProfile!.church_id)
        .order('name');

      if (error) throw error;
      return data as ServiceListItem[];
    },
    enabled: !!userProfile?.church_id && !!existingConnection,
  });

  const {
    data: sites,
    isLoading: isLoadingSites,
    error: sitesError,
  } = useQuery({
    queryKey: ['churchsuite-sites', userProfile?.church_id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<{
        sites: { id: string; name: string }[];
      }>('get-churchsuite-sites');

      if (error) throw error;
      return data?.sites ?? [];
    },
    enabled: !!userProfile?.church_id && !!existingConnection,
  });

  const siteOptions: SelectOption[] = (sites ?? []).map((site) => ({
    label: site.name,
    value: site.id,
  }));

  const linkSiteMutation = useMutation({
    mutationFn: async ({
      serviceId,
      churchsuiteSiteId,
    }: {
      serviceId: string;
      churchsuiteSiteId: string;
    }) => {
      const { error } = await supabase.rpc('link_service_to_churchsuite_site', {
        p_service_id: serviceId,
        p_churchsuite_site_id: churchsuiteSiteId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['church-services', userProfile?.church_id],
      });
    },
    onError: (err) => {
      Alert.alert(
        'Something went wrong',
        err instanceof Error
          ? err.message
          : 'Could not link this service to a ChurchSuite site.'
      );
    },
  });

  const handleLinkSite = useCallback(
    (serviceId: string, option: SelectOption) => {
      linkSiteMutation.mutate({
        serviceId,
        churchsuiteSiteId: String(option.value),
      });
    },
    [linkSiteMutation]
  );

  // When ChurchSuite only has one site, there's nothing to choose - link any
  // unlinked service to it automatically instead of making an admin pick it.
  const autoLinkedServiceIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!sites || sites.length !== 1 || !services) return;

    const [onlySite] = sites;

    services.forEach((service) => {
      if (
        service.churchsuite_site_id ||
        autoLinkedServiceIds.current.has(service.id)
      ) {
        return;
      }

      autoLinkedServiceIds.current.add(service.id);
      linkSiteMutation.mutate({
        serviceId: service.id,
        churchsuiteSiteId: onlySite.id,
      });
    });
  }, [sites, services, linkSiteMutation]);

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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_churchsuite_connection');

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: connectionQueryKey });
      setShowDeleteConfirm(false);
    } catch (err) {
      console.log(err);
      Alert.alert(
        'Something went wrong',
        err instanceof Error
          ? err.message
          : 'Could not delete the ChurchSuite connection.'
      );
    } finally {
      setIsDeleting(false);
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
                To change, disconnect and add the new credentials.
              </Text>
              <Button
                title="Disconnect"
                variant="danger"
                onPress={() => setShowDeleteConfirm(true)}
                style={styles.disconnectButton}
              />
            </View>
          ) : null}
          {existingConnection ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface.primary,
                  borderColor: theme.colors.border.primary,
                },
              ]}
            >
              <Text style={styles.sectionTitle}>Services</Text>
              {isLoadingServices ? (
                <Text color="secondary">Loading services...</Text>
              ) : services && services.length > 0 ? (
                <View style={styles.serviceList}>
                  {services.map((service) => (
                    <View
                      key={service.id}
                      style={[
                        styles.serviceRow,
                        { borderColor: theme.colors.border.secondary },
                      ]}
                    >
                      <Text>{service.name}</Text>
                      <Text color="secondary" variant="bodySmall">
                        {service.day_of_week}
                        {service.start_time
                          ? ` · ${formatTime(service.start_time)}`
                          : ''}
                      </Text>
                      {sitesError ? (
                        <Text color="error" variant="bodySmall">
                          Could not load ChurchSuite sites:{' '}
                          {sitesError instanceof Error
                            ? sitesError.message
                            : 'Unknown error'}
                        </Text>
                      ) : (
                        <Select
                          label="ChurchSuite site"
                          placeholder={
                            isLoadingSites ? 'Loading sites...' : 'Not linked'
                          }
                          options={siteOptions}
                          value={service.churchsuite_site_id ?? undefined}
                          disabled={
                            isLoadingSites ||
                            (linkSiteMutation.isPending &&
                              linkSiteMutation.variables?.serviceId ===
                                service.id)
                          }
                          onSelect={(option) =>
                            handleLinkSite(service.id, option)
                          }
                          style={styles.siteSelect}
                        />
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <Text color="secondary">
                  No services found for this church.
                </Text>
              )}
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
        <ConfirmationDialog
          visible={showDeleteConfirm}
          title="Disconnect ChurchSuite"
          message="Are you sure you want to remove this church's ChurchSuite connection?"
          details={[
            'Stored ChurchSuite credentials will be permanently deleted',
            'Automatic ChurchSuite contact syncing will stop for this church',
            "You'll need to reconnect with new credentials to use ChurchSuite again",
          ]}
          confirmText="Disconnect"
          confirmVariant="danger"
          isDestructive
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
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
    gap: 12,
  },
  disconnectButton: {
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    marginBottom: 12,
  },
  serviceList: {
    gap: 12,
  },
  serviceRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 2,
  },
  siteSelect: {
    marginTop: 4,
    marginBottom: 0,
  },
});

export default ChurchsuiteAdminScreen;
