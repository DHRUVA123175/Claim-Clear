/*
# Create cases and denial_codes tables for ClaimClear

1. Extensions
- Enable `vector` extension for embedding-based similarity search on denial codes.

2. New Tables
- `denial_codes` — knowledge base of common insurance denial reason codes.
  - `id` (uuid, primary key)
  - `code` (text, unique, not null) — the denial reason code/identifier (e.g. "PR-1", "MED-NEC")
  - `label` (text, not null) — short human-readable label
  - `description` (text, not null) — full description of the denial reason
  - `template_argument` (text, not null) — template argument structure for appealing this denial type
  - `evidence_needed` (text, not null) — what evidence typically wins this type of appeal
  - `keywords` (text, not null) — keywords used for matching during extraction
  - `embedding` (vector(768), nullable) — embedding of the code+label+description for similarity search
  - `created_at` (timestamptz, default now())

- `cases` — user appeal cases, keyed to the authenticated user.
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users)
  - `insurer` (text, nullable) — insurance company name
  - `denial_code` (text, nullable) — the denial reason code identified
  - `policy_type` (text, nullable) — type of insurance policy
  - `denial_date` (date, nullable) — date the denial was issued
  - `claim_number` (text, nullable) — claim reference number
  - `patient_name` (text, nullable) — patient name from the denial letter
  - `extracted_fields` (jsonb, default '{}') — all fields extracted by the Intake Agent with confidence flags
  - `missing_fields` (text[], default '{}') — fields the Letter Drafting Agent still needs
  - `follow_up_questions` (jsonb, default '[]') — questions generated for the user
  - `user_answers` (jsonb, default '{}') — user's answers to follow-up questions
  - `letter_draft` (text, nullable) — the generated appeal letter text
  - `file_path` (text, nullable) — storage path of the uploaded denial letter
  - `status` (text, not null, default 'created') — case status: created, extracting, reviewing, clarifying, drafting, completed, error
  - `agent_step` (text, not null, default 'idle') — current agent step for the live stepper: idle, intake_extracting, intake_reviewing, letter_clarifying, letter_drafting, done
  - `payment_status` (text, not null, default 'unpaid') — unpaid, pending, paid
  - `paypal_order_id` (text, nullable) — PayPal order ID after payment
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

3. Indexes
- `cases_user_id_idx` on cases(user_id) for fast per-user queries
- `cases_status_idx` on cases(status) for status polling
- `denial_codes_code_idx` on denial_codes(code) for lookups

4. Security
- Enable RLS on both tables.
- cases: owner-scoped CRUD — each authenticated user can only access their own cases (user_id defaults to auth.uid()).
- denial_codes: read-only for authenticated users (they only need to query the knowledge base, never modify it).

5. Storage
- Create a private storage bucket `denial-letters` for uploaded denial letter files.
*/

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- denial_codes knowledge base table
CREATE TABLE IF NOT EXISTS denial_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  description text NOT NULL,
  template_argument text NOT NULL,
  evidence_needed text NOT NULL,
  keywords text NOT NULL DEFAULT '',
  embedding vector(768),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE denial_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_denial_codes" ON denial_codes;
CREATE POLICY "read_denial_codes"
  ON denial_codes FOR SELECT
  TO authenticated USING (true);

-- cases table
CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  insurer text,
  denial_code text,
  policy_type text,
  denial_date date,
  claim_number text,
  patient_name text,
  extracted_fields jsonb NOT NULL DEFAULT '{}',
  missing_fields text[] NOT NULL DEFAULT '{}',
  follow_up_questions jsonb NOT NULL DEFAULT '[]',
  user_answers jsonb NOT NULL DEFAULT '{}',
  letter_draft text,
  file_path text,
  status text NOT NULL DEFAULT 'created',
  agent_step text NOT NULL DEFAULT 'idle',
  payment_status text NOT NULL DEFAULT 'unpaid',
  paypal_order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cases" ON cases;
CREATE POLICY "select_own_cases"
  ON cases FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_cases" ON cases;
CREATE POLICY "insert_own_cases"
  ON cases FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_cases" ON cases;
CREATE POLICY "update_own_cases"
  ON cases FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_cases" ON cases;
CREATE POLICY "delete_own_cases"
  ON cases FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS cases_user_id_idx ON cases(user_id);
CREATE INDEX IF NOT EXISTS cases_status_idx ON cases(status);
CREATE INDEX IF NOT EXISTS denial_codes_code_idx ON denial_codes(code);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cases_updated_at ON cases;
CREATE TRIGGER cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for denial letters
INSERT INTO storage.buckets (id, name, public)
VALUES ('denial-letters', 'denial-letters', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can manage their own files
DROP POLICY IF EXISTS "Users can upload own denial letters" ON storage.objects;
CREATE POLICY "Users can upload own denial letters"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'denial-letters' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can read own denial letters" ON storage.objects;
CREATE POLICY "Users can read own denial letters"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'denial-letters' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own denial letters" ON storage.objects;
CREATE POLICY "Users can delete own denial letters"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'denial-letters' AND auth.uid()::text = (storage.foldername(name))[1]);
