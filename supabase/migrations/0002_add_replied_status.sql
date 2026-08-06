ALTER TABLE ig_crm_leads DROP CONSTRAINT ig_crm_leads_status_check;

ALTER TABLE ig_crm_leads ADD CONSTRAINT ig_crm_leads_status_check
  CHECK (status IN ('TO_CONTACT', 'FOLLOW_UP', 'REPLIED', 'CLIENT'));
