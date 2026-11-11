import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const PAYPAL_API = 'https://api-m.sandbox.paypal.com';
const APPEAL_PRICE = '19.00';
const CURRENCY = 'USD';

type SupabaseClient = ReturnType<typeof createClient>;
type PayPalPayload = {
  id?: unknown;
  status?: unknown;
  name?: unknown;
  links?: unknown;
  purchase_units?: unknown;
};

type CasePayment = {
  id: string;
  payment_status: string;
  paypal_order_id: string | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonError('A POST request is required.', 405);
  }

  try {
    const body = await req.json();
    const { action, case_id: caseId, order_id: orderId } = body ?? {};
    if (typeof caseId !== 'string' || !caseId.trim()) {
      return jsonError('A valid case is required.', 400);
    }

    const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = req.headers.get('Authorization');

    if (!clientId || !clientSecret || !supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonError('PayPal sandbox is not configured.', 503);
    }
    if (!authorization) {
      return jsonError('Authentication is required.', 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonError('Authentication is required.', 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, user_id, payment_status, paypal_order_id')
      .eq('id', caseId)
      .maybeSingle();

    if (caseError || !caseData || caseData.user_id !== userData.user.id) {
      return jsonError('Case not found.', 404);
    }

    if (action === 'create_order') {
      return await createOrder(req, supabase, clientId, clientSecret, caseData);
    }

    if (action === 'capture_order') {
      if (typeof orderId !== 'string' || !orderId.trim()) {
        return jsonError('A valid PayPal order is required.', 400);
      }
      return await captureOrder(supabase, clientId, clientSecret, caseData, orderId);
    }

    return jsonError('Unknown payment action.', 400);
  } catch {
    // Keep provider/network/database details out of client responses.
    return jsonError('Payment processing failed.', 500);
  }
});

async function getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('PayPal sandbox authentication failed.');
  }

  const data = await readPayPalJson(response);
  if (typeof data.access_token !== 'string' || !data.access_token) {
    throw new Error('PayPal did not return an access token.');
  }
  return data.access_token;
}

async function readPayPalJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function hasExpectedPurchaseUnit(payload: PayPalPayload, caseId: string): boolean {
  if (!Array.isArray(payload.purchase_units) || payload.purchase_units.length !== 1) return false;
  const unit = payload.purchase_units[0] as {
    reference_id?: unknown;
    amount?: { currency_code?: unknown; value?: unknown };
  };
  return unit.reference_id === caseId
    && unit.amount?.currency_code === CURRENCY
    && unit.amount?.value === APPEAL_PRICE;
}

async function createOrder(
  req: Request,
  supabase: SupabaseClient,
  clientId: string,
  clientSecret: string,
  caseData: CasePayment
) {
  if (caseData.payment_status === 'paid') {
    return jsonResponse({ status: 'COMPLETED', alreadyPaid: true });
  }

  const origin = req.headers.get('Origin');
  if (!origin || !/^https?:\/\//i.test(origin)) {
    return jsonError('A valid application origin is required.', 400);
  }
  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    return jsonError('A valid application origin is required.', 400);
  }
  if (parsedOrigin.origin !== origin || parsedOrigin.username || parsedOrigin.password) {
    return jsonError('A valid application origin is required.', 400);
  }

  const accessToken = await getPayPalAccessToken(clientId, clientSecret);
  const returnUrl = `${origin}/?paypal=success&case_id=${encodeURIComponent(caseData.id)}`;
  const cancelUrl = `${origin}/?paypal=cancelled&case_id=${encodeURIComponent(caseData.id)}`;

  const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      // Stable request ID makes retries for this case idempotent at PayPal.
      'PayPal-Request-Id': `claimclear-${caseData.id}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: caseData.id,
          description: 'ClaimClear Appeal Letter Generation',
          amount: { currency_code: CURRENCY, value: APPEAL_PRICE },
        },
      ],
      application_context: {
        brand_name: 'ClaimClear',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });

  const order = await readPayPalJson(response) as PayPalPayload;
  if (!response.ok) {
    throw new Error('PayPal could not create the sandbox order.');
  }

  const links = Array.isArray(order.links) ? order.links as Array<{ rel?: unknown; href?: unknown }> : [];
  const approvalUrl = links.find((link) => link.rel === 'approve')?.href;
  if (typeof order.id !== 'string' || typeof approvalUrl !== 'string' || !approvalUrl
    || order.status !== 'CREATED' || !hasExpectedPurchaseUnit(order, caseData.id)) {
    throw new Error('PayPal returned an invalid order.');
  }

  const { data: updated, error: updateError } = await supabase
    .from('cases')
    .update({ payment_status: 'pending', paypal_order_id: order.id })
    .eq('id', caseData.id)
    .neq('payment_status', 'paid')
    .select('id')
    .maybeSingle();

  if (updateError) throw new Error('Could not save the payment order.');
  if (!updated) {
    const { data: latest, error: latestError } = await supabase
      .from('cases')
      .select('payment_status')
      .eq('id', caseData.id)
      .maybeSingle();
    if (!latestError && latest?.payment_status === 'paid') {
      return jsonResponse({ status: 'COMPLETED', alreadyPaid: true });
    }
    return jsonError('The case payment state changed; please retry.', 409);
  }

  return jsonResponse({ orderId: order.id, approvalUrl, status: order.status });
}

async function captureOrder(
  supabase: SupabaseClient,
  clientId: string,
  clientSecret: string,
  caseData: CasePayment,
  orderId: string
) {
  if (caseData.payment_status === 'paid') {
    return jsonResponse({ status: 'COMPLETED', alreadyPaid: true, orderId: caseData.paypal_order_id });
  }
  if (caseData.paypal_order_id !== orderId) {
    return jsonError('This payment does not belong to the current case.', 409);
  }

  const accessToken = await getPayPalAccessToken(clientId, clientSecret);
  const captureResponse = await fetch(`${PAYPAL_API}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `claimclear-capture-${orderId}`,
    },
  });

  let captureData = await readPayPalJson(captureResponse) as PayPalPayload;
  if (!captureResponse.ok) {
    if (captureData.name !== 'ORDER_ALREADY_CAPTURED') {
      return jsonError('PayPal could not capture the sandbox payment.', 502);
    }
    // Never infer payment from the error name alone; fetch and verify the order.
    const orderResponse = await fetch(`${PAYPAL_API}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!orderResponse.ok) {
      return jsonError('PayPal could not verify the existing payment.', 502);
    }
    captureData = await readPayPalJson(orderResponse) as PayPalPayload;
  }

  if (captureData.id !== orderId
    || captureData.status !== 'COMPLETED'
    || !hasExpectedPurchaseUnit(captureData, caseData.id)) {
    return jsonError('PayPal returned an unverified payment.', 402);
  }

  const unit = (captureData.purchase_units as Array<{
    reference_id?: unknown;
    payments?: {
      captures?: Array<{
        status?: unknown;
        amount?: { currency_code?: unknown; value?: unknown };
      }>;
    };
  }>)[0];
  const captures = unit.payments?.captures;
  const verifiedCapture = Array.isArray(captures) && captures.length === 1
    && captures[0].status === 'COMPLETED'
    && captures[0].amount?.currency_code === CURRENCY
    && captures[0].amount?.value === APPEAL_PRICE;
  if (!verifiedCapture) {
    return jsonError('PayPal returned an unverified payment.', 402);
  }

  const { data: updated, error: updateError } = await supabase
    .from('cases')
    .update({ payment_status: 'paid' })
    .eq('id', caseData.id)
    .eq('paypal_order_id', orderId)
    .neq('payment_status', 'paid')
    .select('id')
    .maybeSingle();

  if (updateError) return jsonError('Payment was captured but could not be recorded.', 500);
  if (!updated) {
    const { data: latest, error: latestError } = await supabase
      .from('cases')
      .select('payment_status, paypal_order_id')
      .eq('id', caseData.id)
      .maybeSingle();
    if (!latestError && latest?.payment_status === 'paid' && latest.paypal_order_id === orderId) {
      return jsonResponse({ status: 'COMPLETED', alreadyPaid: true, orderId });
    }
    return jsonError('Payment was captured but the case state changed; contact support before retrying.', 409);
  }

  return jsonResponse({ status: 'COMPLETED', orderId });
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
