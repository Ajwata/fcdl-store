type VerifyCreateResponse = {
  success: boolean;
  error?: string;
  request_id?: string;
};

type VerifyCheckResponse = {
  success: boolean;
  error?: string;
  verify_id?: string;
  phone?: string;
  type?: string;
  status?: string;
  service_id?: number;
};

const ALPHASMS_API_URL = "https://alphasms.ua/api/verify.php";

export function isAlphaSmsConfigured(): boolean {
  return Boolean(process.env.ALPHASMS_API_KEY?.trim());
}

/**
 * Create OTP code via AlphaSMS Verify API.
 * AlphaSMS generates and sends the code, returns verify_id.
 */
export async function createVerifyCode(phone: string): Promise<string> {
  const auth = process.env.ALPHASMS_API_KEY?.trim();
  if (!auth) {
    throw new Error("Не налаштовано ALPHASMS_API_KEY");
  }

  const normalizedPhone = phone.replace(/\D/g, "");
  const payload: Record<string, unknown> = {
    auth,
    command: "verify/create",
    phone: normalizedPhone,
    type: "sms",
    lang: "uk",
    code_length: 6,
    code_type: "numeric",
  };

  const sender = process.env.ALPHASMS_SENDER?.trim();
  if (sender) {
    payload.sender_name = sender;
  }

  console.log(`[AlphaSMS] verify/create request: phone=${normalizedPhone}`);
  console.log(`[AlphaSMS] Full payload:`, JSON.stringify(payload, null, 2));

  const response = await fetch(ALPHASMS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const json = (await response.json().catch(() => ({}))) as VerifyCreateResponse;
  
  console.log(`[AlphaSMS] verify/create full response:`, JSON.stringify(json, null, 2));
  console.log(`[AlphaSMS] verify/create response:`, {
    success: json.success,
    error: json.error,
    requestId: json.request_id,
    httpStatus: response.status,
  });

  if (!json.success) {
    throw new Error(`AlphaSMS verify/create: ${json.error || "UNKNOWN_ERROR"}`);
  }

  if (!json.request_id) {
    throw new Error("AlphaSMS verify/create: no request_id in response");
  }

  console.log(`[AlphaSMS] SMS code sent successfully, verify_id=${json.request_id}`);
  return json.request_id;
}

/**
 * Check OTP code via AlphaSMS Verify API.
 * Returns true if code is approved, false otherwise.
 */
export async function checkVerifyCode(phone: string, code: string, verifyId: string): Promise<boolean> {
  const auth = process.env.ALPHASMS_API_KEY?.trim();
  if (!auth) {
    throw new Error("Не налаштовано ALPHASMS_API_KEY");
  }

  const normalizedPhone = phone.replace(/\D/g, "");
  const payload = {
    auth,
    command: "verify",
    phone: normalizedPhone,
    code: code.trim(),
    verify_id: verifyId,
  };

  console.log(`[AlphaSMS] verify request:`, { phone: normalizedPhone, verifyId });

  const response = await fetch(ALPHASMS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const json = (await response.json().catch(() => ({}))) as VerifyCheckResponse;
  
  console.log(`[AlphaSMS] verify full response:`, JSON.stringify(json, null, 2));
  console.log(`[AlphaSMS] verify response:`, {
    success: json.success,
    status: json.status,
    error: json.error,
    httpStatus: response.status,
  });

  if (!json.success) {
    throw new Error(`AlphaSMS verify: ${json.error || "UNKNOWN_ERROR"}`);
  }

  const isApproved = json.status === "approved";
  console.log(`[AlphaSMS] Code verification: status=${json.status}, approved=${isApproved}`);

  // Possible statuses: approved, pending, expired, blocked
  return isApproved;
}