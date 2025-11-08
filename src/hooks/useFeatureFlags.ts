import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type FlagMap = Record<string, boolean>;

export function useFeatureFlags() {
  const { user } = useAuth();
  const [perUser, setPerUser] = useState<FlagMap>({});
  const [globalFlags, setGlobalFlags] = useState<FlagMap>({});
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: global }, { data: ufa }] = await Promise.all([
        supabase.from('feature_access').select('feature_name, enabled'),
        supabase.from('user_feature_access').select('feature_name, enabled').eq('user_id', user.id),
      ]);
      const g: FlagMap = {};
      (global || []).forEach((row: any) => {
        g[row.feature_name] = !!row.enabled;
      });
      const u: FlagMap = {};
      (ufa || []).forEach((row: any) => {
        u[row.feature_name] = !!row.enabled;
      });
      setGlobalFlags(g);
      setPerUser(u);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    refresh();
    const chUser = supabase
      .channel(`flags_user_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_feature_access', filter: `user_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    const chGlobal = supabase
      .channel('flags_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feature_access' }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(chUser);
      supabase.removeChannel(chGlobal);
    };
  }, [user?.id]);

  const has = useMemo(() => {
    return (name: string) => {
      if (name in perUser) return !!perUser[name];
      if (name in globalFlags) return !!globalFlags[name];
      return false; // strict default: hidden unless enabled
    };
  }, [perUser, globalFlags]);

  const all = useMemo(() => ({ perUser, global: globalFlags }), [perUser, globalFlags]);

  return { loading, has, flags: all, refresh };
}
