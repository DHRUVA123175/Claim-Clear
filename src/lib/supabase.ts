import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  detectSessionInUrl: true,
  flowType: 'pkce',
  storageKey: 'claimclear-auth',
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  debug: false,
  },
});

export type CaseStatus =
  | 'created'
  | 'extracting'
  | 'reviewing'
  | 'clarifying'
  | 'drafting'
  | 'completed'
  | 'error';

export type AgentStep =
  | 'idle'
  | 'intake_extracting'
  | 'intake_reviewing'
  | 'letter_clarifying'
  | 'letter_drafting'
  | 'done';

export type PaymentStatus = 'unpaid' | 'pending' | 'paid';

export interface ExtractedField {
  value: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ExtractedFields {
  insurer?: ExtractedField;
  denial_code?: ExtractedField;
  denial_reason?: ExtractedField;
  policy_type?: ExtractedField;
  denial_date?: ExtractedField;
  claim_number?: ExtractedField;
  patient_name?: ExtractedField;
  service_description?: ExtractedField;
  [key: string]: ExtractedField | undefined;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  field_key: string;
  placeholder?: string;
}

export interface AgentEvent {
  id: string;
  case_id: string;
  user_id: string;
  agent_name: string;
  step_name: string;
  step_label: string;
  reasoning: string;
  status: 'running' | 'completed' | 'error';
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LLMCall {
  id: string;
  case_id: string;
  agent_name: string;
  step_name: string;
  model: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  latency_ms: number | null;
  status: string;
  created_at: string;
}

export interface Case {
  id: string;
  user_id: string;
  insurer: string | null;
  denial_code: string | null;
  policy_type: string | null;
  denial_date: string | null;
  claim_number: string | null;
  patient_name: string | null;
  extracted_fields: ExtractedFields;
  missing_fields: string[];
  follow_up_questions: FollowUpQuestion[];
  user_answers: Record<string, string>;
  letter_draft: string | null;
  file_path: string | null;
  status: CaseStatus;
  agent_step: AgentStep;
  payment_status: PaymentStatus;
  paypal_order_id: string | null;
  appeal_strategy: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
