/*
# Harden ClaimClear case mutations

1. Purpose
- Keep payment, workflow, extracted agent output, and ownership fields server-controlled.
- Prevent signed-in users from changing protected case columns through the browser data API.
- Preserve the existing owner-scoped read and delete behavior.

2. Security changes
- Authenticated users may update only user-editable case fields: extracted_fields, insurer, denial_code, policy_type, denial_date, claim_number, patient_name, and user_answers.
- Payment and agent-owned fields remain writable by the service-role edge functions only.
- The existing owner predicate remains required for all case updates.

3. Important notes
- The current review flow can still edit extracted case details.
- PayPal and agent functions continue to use the service role for their server-side transitions.
*/

REVOKE UPDATE ON TABLE public.cases FROM authenticated;
GRANT UPDATE (
  extracted_fields,
  insurer,
  denial_code,
  policy_type,
  denial_date,
  claim_number,
  patient_name,
  user_answers
) ON TABLE public.cases TO authenticated;

DROP POLICY IF EXISTS "update_own_cases" ON public.cases;
CREATE POLICY "update_own_cases"
  ON public.cases FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.agent_events FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.llm_calls FROM authenticated;

DROP POLICY IF EXISTS "insert_own_agent_events" ON public.agent_events;
DROP POLICY IF EXISTS "update_own_agent_events" ON public.agent_events;
DROP POLICY IF EXISTS "delete_own_agent_events" ON public.agent_events;
DROP POLICY IF EXISTS "insert_own_llm_calls" ON public.llm_calls;
DROP POLICY IF EXISTS "delete_own_llm_calls" ON public.llm_calls;

DROP POLICY IF EXISTS "select_own_agent_events" ON public.agent_events;
CREATE POLICY "select_own_agent_events"
  ON public.agent_events FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.cases
      WHERE public.cases.id = agent_events.case_id
      AND public.cases.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "select_own_llm_calls" ON public.llm_calls;
CREATE POLICY "select_own_llm_calls"
  ON public.llm_calls FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.cases
      WHERE public.cases.id = llm_calls.case_id
      AND public.cases.user_id = auth.uid()
    )
  );