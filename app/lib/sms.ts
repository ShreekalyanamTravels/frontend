/* Thin wrapper around ProactiveSMS's GET-based send API (https://www.proactivesms.in/sendsms.jsp)
 * — the same gateway already used for transactional SMS elsewhere in this business, credentials
 * supplied via SMS_API_*. There's no documented success/failure response shape for this provider,
 * so a 2xx HTTP status is treated as "sent"; the response body is logged either way so failures
 * (bad credentials, invalid number, low balance) are still visible in the logs even though the
 * caller can't branch on them. */

function buildOtpSmsUrl(mobile: string, otp: string): string {
  const message =
    `Dear User, \n\nYour OTP for login to Shree Kalyanam is ${otp}. ` +
    `Please do not share this OTP.\n\nRegards\nShree Kalyanam Team`;

  const params = [
    `user=${encodeURIComponent(process.env.SMS_API_USER ?? "")}`,
    `password=${encodeURIComponent(process.env.SMS_API_PASSWORD ?? "")}`,
    `senderid=${encodeURIComponent(process.env.SMS_API_SENDER_ID ?? "")}`,
    `mobiles=91${mobile}`,
    `sms=${encodeURIComponent(message)}`,
  ].join("&");

  return `${process.env.SMS_API_URL}?${params}`;
}

export async function sendOtpSms(mobile: string, otp: string): Promise<void> {
  const res = await fetch(buildOtpSmsUrl(mobile, otp));
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`SMS API request failed: ${res.status} ${text}`);
  }
  console.log("ProactiveSMS response:", text);
}
