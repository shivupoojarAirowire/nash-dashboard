import { supabase } from "./client";

export type FeatureFlag = {
  feature_name: string;
  enabled: boolean;
};

export async function listFeatureCatalog(): Promise<string[]> {
  // Try to fetch from feature_access; fallback to distinct names in user_feature_access; else fallback to default list
  const defaults = [
    "Dashboard",
    "Users",
    "Stores",
    "Delivery",
    "Inventory",
    "Subscriptions",
    "Upload Data",
    "Project Manager",
    "Engineering",
  ];

  const { data: global, error: globalErr } = await supabase
    .from("feature_access")
    .select("feature_name");

  if (!globalErr && global && global.length) {
    return Array.from(new Set(global.map((g) => g.feature_name)));
  }

  const { data: perUser, error: perUserErr } = await supabase
    .from("user_feature_access")
    .select("feature_name");

  if (!perUserErr && perUser && perUser.length) {
    return Array.from(new Set(perUser.map((g) => g.feature_name)));
  }

  return defaults;
}

export async function getUserFeatureFlags(userId: string): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from("user_feature_access")
    .select("feature_name, enabled")
    .eq("user_id", userId);

  if (error) throw error;
  const map: Record<string, boolean> = {};
  for (const row of data || []) {
    map[row.feature_name] = row.enabled;
  }
  return map;
}

export async function upsertUserFeatureFlags(
  userId: string,
  flags: Record<string, boolean>
) {
  const rows = Object.entries(flags).map(([feature_name, enabled]) => ({
    user_id: userId,
    feature_name,
    enabled,
  }));

  const { error } = await supabase
    .from("user_feature_access")
    .upsert(rows, { onConflict: "user_id,feature_name" });
  if (error) throw error;
}
