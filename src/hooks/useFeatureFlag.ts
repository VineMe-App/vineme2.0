import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

type FeatureFlags = 'churchsuite';

export const featureFlagKeys = {
  all: ['featureFlags'] as const,
  detail: (flagName: string) => [...featureFlagKeys.all, flagName] as const,
};

const FLAG_NOT_FOUND_MESSAGE = 'feature flag not found';

/**
 * Hook to check whether a feature flag is enabled, via supaflag's
 * `is_feature_flag_enabled` RPC (see
 * supabase/migrations/20260716083254_supaflag_setup.sql).
 *
 * Resolves to `false` rather than throwing when the flag doesn't exist yet,
 * so callers can treat "not rolled out" the same as "off".
 */
export function useFeatureFlag(flagName: FeatureFlags) {
  const query = useQuery({
    queryKey: featureFlagKeys.detail(flagName),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_feature_flag_enabled', {
        flag_name: flagName,
      });

      if (error) {
        if (error.message?.includes(FLAG_NOT_FOUND_MESSAGE)) {
          return false;
        }
        throw error;
      }

      return data ?? false;
    },
    enabled: !!flagName,
    staleTime: 60 * 1000,
  });

  return { isFeatureEnabled: query.data ?? false, ...query };
}
