-- Directory import (v2026.7): additive, idempotent. Apply with psql.
-- Not part of the drizzle-kit journal on purpose: production's schema history
-- is mixed (push, dashboard, migrations), so this file must be safe to run
-- on any state and safe to run twice.
BEGIN;

ALTER TABLE lawyers
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS qualification text,
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS languages text[],
  ADD COLUMN IF NOT EXISTS credentials text[],
  ADD COLUMN IF NOT EXISTS rankings jsonb,
  ADD COLUMN IF NOT EXISTS standing_note text,
  ADD COLUMN IF NOT EXISTS standing_source_url text,
  ADD COLUMN IF NOT EXISTS import_data jsonb,
  ADD COLUMN IF NOT EXISTS imported_at timestamp;

ALTER TABLE firms
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS fax text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS social_links jsonb,
  ADD COLUMN IF NOT EXISTS founded_year integer,
  ADD COLUMN IF NOT EXISTS opening_hours text,
  ADD COLUMN IF NOT EXISTS languages text[],
  ADD COLUMN IF NOT EXISTS bank_panels text[],
  ADD COLUMN IF NOT EXISTS legal_networks text[],
  ADD COLUMN IF NOT EXISTS rankings jsonb,
  ADD COLUMN IF NOT EXISTS logo_is_light boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS import_data jsonb,
  ADD COLUMN IF NOT EXISTS imported_at timestamp;

CREATE TABLE IF NOT EXISTS external_ids (
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  namespace text NOT NULL,
  value text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT external_ids_entity_type_namespace_value_pk PRIMARY KEY (entity_type, namespace, value)
);
CREATE INDEX IF NOT EXISTS external_ids_entity_idx ON external_ids (entity_type, entity_id);

-- bar_status is plain text in schema.ts and gains the value 'struck_off'.
-- If production carries a CHECK constraint on it, this fails loudly here
-- instead of at import time.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'lawyers'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%bar_status%'
  LOOP
    RAISE EXCEPTION 'lawyers has CHECK constraint % on bar_status; extend it to allow struck_off first', c.conname;
  END LOOP;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'lawyers' AND column_name = 'bar_status' AND data_type = 'USER-DEFINED') THEN
    RAISE EXCEPTION 'lawyers.bar_status is an enum type in this database; add the value struck_off to it first';
  END IF;
END $$;

COMMIT;
