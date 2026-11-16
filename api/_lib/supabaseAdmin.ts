export interface SupabaseAdminConfig {
  url: string;
  key: string;
  isServiceRole: boolean;
}

export function getSupabaseAdminConfig(): SupabaseAdminConfig | null {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const key = serviceKey || anonKey;
  if (!url || !key) return null;
  return {
    url,
    key,
    isServiceRole: Boolean(serviceKey)
  };
}

export async function sbSelect<T = any>(table: string, queryString: string = 'select=*'): Promise<T[]> {
  const cfg = getSupabaseAdminConfig();
  if (!cfg) return [];
  const res = await fetch(`${cfg.url}/rest/v1/${table}?${queryString}`, {
    method: 'GET',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Supabase select ${table} failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function sbInsert(table: string, row: Record<string, any>): Promise<boolean> {
  const cfg = getSupabaseAdminConfig();
  if (!cfg) return false;
  const res = await fetch(`${cfg.url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(row)
  });
  return res.ok;
}

export async function sbUpsert(
  table: string,
  row: Record<string, any>,
  onConflict?: string
): Promise<boolean> {
  const cfg = getSupabaseAdminConfig();
  if (!cfg) return false;
  const suffix = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
  const res = await fetch(`${cfg.url}/rest/v1/${table}${suffix}`, {
    method: 'POST',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(row)
  });
  return res.ok;
}

