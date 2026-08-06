import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export type Lead = {
  id: string;
  brand_name: string;
  instagram_username: string;
  website: string | null;
  status: 'TO_CONTACT' | 'FOLLOW_UP' | 'CLIENT';
  created_at: string;
};

const STORAGE_FILE = join(process.cwd(), '.data', 'leads.json');

function ensureDataDir() {
  const dir = join(process.cwd(), '.data');
  if (!existsSync(dir)) {
    require('fs').mkdirSync(dir, { recursive: true });
  }
}

export const storage = {
  getLeads(): Lead[] {
    try {
      ensureDataDir();
      if (!existsSync(STORAGE_FILE)) return [];
      const data = readFileSync(STORAGE_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  addLead(lead: Omit<Lead, 'id' | 'created_at'>): Lead {
    const leads = this.getLeads();
    const newLead: Lead = {
      ...lead,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    };
    leads.push(newLead);
    ensureDataDir();
    writeFileSync(STORAGE_FILE, JSON.stringify(leads, null, 2));
    return newLead;
  },

  updateLead(id: string, updates: Partial<Lead>): Lead | null {
    const leads = this.getLeads();
    const index = leads.findIndex(l => l.id === id);
    if (index === -1) return null;
    leads[index] = { ...leads[index], ...updates };
    ensureDataDir();
    writeFileSync(STORAGE_FILE, JSON.stringify(leads, null, 2));
    return leads[index];
  },

  deleteLead(id: string): boolean {
    const leads = this.getLeads();
    const filtered = leads.filter(l => l.id !== id);
    ensureDataDir();
    writeFileSync(STORAGE_FILE, JSON.stringify(filtered, null, 2));
    return filtered.length < leads.length;
  },
};
