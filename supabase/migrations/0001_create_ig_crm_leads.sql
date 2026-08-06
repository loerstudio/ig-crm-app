CREATE TABLE IF NOT EXISTS ig_crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  instagram_username TEXT NOT NULL,
  website TEXT,
  status TEXT NOT NULL DEFAULT 'TO_CONTACT' CHECK (status IN ('TO_CONTACT', 'FOLLOW_UP', 'CLIENT')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ig_crm_leads_status ON ig_crm_leads(status);

ALTER TABLE ig_crm_leads ENABLE ROW LEVEL SECURITY;
-- No policies: only the service_role key (used server-side) can access this table.
-- The anon key is never used to query it directly from the client.
