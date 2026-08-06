import { createClient } from '@supabase/supabase-js';

export type Lead = {
  id: string;
  brand_name: string;
  instagram_username: string;
  website: string | null;
  status: 'TO_CONTACT' | 'FOLLOW_UP' | 'REPLIED' | 'CLIENT';
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const TABLE = 'ig_crm_leads';

export const storage = {
  async getLeads(): Promise<Lead[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Lead[];
  },

  async addLead(lead: Omit<Lead, 'id' | 'created_at'>): Promise<Lead> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert([lead])
      .select()
      .single();
    if (error) throw error;
    return data as Lead;
  },

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data as Lead | null;
  },

  async deleteLead(id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id)
      .select();
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  },
};
