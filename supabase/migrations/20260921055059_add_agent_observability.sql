/*
# Add agent observability tables for ClaimClear

1. New Tables
- `agent_events` — real-time audit trail of every agent step.
  Records each sub-step in the agent pipeline with reasoning text, status,
  and timestamps. The frontend subscribes to this table via Supabase
  Realtime to show a live "agent reasoning" feed.
  - `id` (uuid, pk)
  - `case_id` (uuid, fk to cases, cascade delete)
  - `user_id` (uuid, fk to auth.users, cascade delete) — for RLS
  - `agent_name` (text) — "intake_agent" or "letter_drafting_agent"
  - `step_name` (text) — e.g. "extract", "verify", "match_code", "analyze_gaps"
  - `step_label` (text) — human-readable label for the UI
  - `reasoning` (text) — what the agent is doing / concluded
  - `status` (text) — "running", "completed", "error"
  - `metadata` (jsonb) — structured data from the step (extracted fields, KB match, critique, etc.)
  - `created_at` (timestamptz, default now())

- `llm_calls` — LLM observability / LLMOps tracking.
  Records every LLM call made by the agents for cost, latency, and quality analysis.
  - `id` (uuid, pk)
  - `case_id` (uuid, fk to cases, cascade delete)
  - `user_id` (uuid, fk to auth.users, cascade delete) — for RLS
  - `agent_name` (text)
  - `step_name` (text)
  - `model` (text) — e.g. "gemini-2.0-flash"
  - `prompt_tokens` (int, nullable)
  - `completion_tokens` (int, nullable)
  - `latency_ms` (int, nullable)
  - `status` (text) — "success" or "error"
  - `error_message` (text, nullable)
  - `created_at` (timestamptz, default now())

2. Modified Tables
- `cases` — add `appeal_strategy` (jsonb, default '{}') column to store the
  agent's chosen strategy (matched KB codes, argument structure, evidence checklist)
  before the letter is drafted.

3. Indexes
- `agent_events_case_id_idx` on agent_events(case_id, created_at) for ordered queries
- `llm_calls_case_id_idx` on llm_calls(case_id, created_at)

4. Security
- Both new tables: RLS enabled, owner-scoped CRUD (user_id defaults to auth.uid()).
- The edge functions use the service role key which bypasses RLS for writes.
*/

-- agent_events table
CREATE TABLE IF NOT EXISTS agent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  step_name text NOT NULL,
  step_label text NOT NULL,
  reasoning text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'running',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_agent_events" ON agent_events;
CREATE POLICY "select_own_agent_events"
  ON agent_events FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_agent_events" ON agent_events;
CREATE POLICY "insert_own_agent_events"
  ON agent_events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_agent_events" ON agent_events;
CREATE POLICY "update_own_agent_events"
  ON agent_events FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_agent_events" ON agent_events;
CREATE POLICY "delete_own_agent_events"
  ON agent_events FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- llm_calls table
CREATE TABLE IF NOT EXISTS llm_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  step_name text NOT NULL,
  model text NOT NULL,
  prompt_tokens integer,
  completion_tokens integer,
  latency_ms integer,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE llm_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_llm_calls" ON llm_calls;
CREATE POLICY "select_own_llm_calls"
  ON llm_calls FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_llm_calls" ON llm_calls;
CREATE POLICY "insert_own_llm_calls"
  ON llm_calls FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_llm_calls" ON llm_calls;
CREATE POLICY "delete_own_llm_calls"
  ON llm_calls FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Add appeal_strategy column to cases
ALTER TABLE cases ADD COLUMN IF NOT EXISTS appeal_strategy jsonb NOT NULL DEFAULT '{}';

-- Indexes
CREATE INDEX IF NOT EXISTS agent_events_case_id_idx ON agent_events(case_id, created_at);
CREATE INDEX IF NOT EXISTS llm_calls_case_id_idx ON llm_calls(case_id, created_at);

-- Enable realtime for agent_events
ALTER PUBLICATION supabase_realtime ADD TABLE agent_events;
