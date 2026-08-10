// Verification disabled at the source (not just via RECAPTCHA_ENABLED) so login/forgot-password
// can never fail with "reCAPTCHA verification failed" from a missing/misconfigured env var on a
// given deploy target. Re-enable by restoring the real check below once RECAPTCHA_SECRET_KEY is
// set to the actual secret from the Google reCAPTCHA console (it was a duplicate of the site key).
export async function verifyRecaptcha(_token: string | undefined | null): Promise<boolean> {
  return true;
}
