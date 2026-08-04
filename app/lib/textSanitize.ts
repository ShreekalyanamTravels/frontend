/* Character-set filters for form fields that must never contain special characters — used by both
 * the GST Details management page and the inline GST section on passenger-details, since both
 * write to the same corporate_gsts columns and should reject the same inputs. Each strips
 * disallowed characters as the user types, rather than only validating on submit. */

// Company name: letters, numbers, spaces, and a minimal set of punctuation — no dots or commas
// (e.g. "Ekam Yoga Care Pvt Ltd", not "Ekam Yoga Care Pvt. Ltd.").
export function sanitizeCompanyName(v: string): string {
  return v.replace(/[^a-zA-Z0-9 &-]/g, "");
}

// Registration No / GST number: alphanumeric only, no spaces or punctuation.
export function sanitizeAlphanumeric(v: string): string {
  return v.replace(/[^a-zA-Z0-9]/g, "");
}

// Pin code: digits only.
export function sanitizeDigits(v: string): string {
  return v.replace(/[^0-9]/g, "");
}

// Address: letters, numbers, spaces, and a minimal set of punctuation — no commas.
export function sanitizeAddress(v: string): string {
  return v.replace(/[^a-zA-Z0-9 .\-/#]/g, "");
}

// Free-text name fields with no digits expected (e.g. a typed State name): letters and spaces only.
export function sanitizeLettersOnly(v: string): string {
  return v.replace(/[^a-zA-Z ]/g, "");
}
