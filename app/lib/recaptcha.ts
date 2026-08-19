interface SiteVerifyResponse {
  success: boolean;
  score?: number;
  "error-codes"?: string[];
}

export async function verifyRecaptcha(token: string | undefined | null): Promise<boolean> {
  if (process.env.RECAPTCHA_ENABLED === "false") return true;
  if (!token) return false;

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY ?? "",
      response: token,
    }),
  });

  const data: SiteVerifyResponse = await res.json();
  return data.success === true;
}
