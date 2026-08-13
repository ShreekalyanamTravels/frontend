import { redirect } from 'next/navigation';

// /corporate/login used to be its own hand-maintained copy of the sign-in page (email/password +
// mobile OTP), which kept drifting out of sync with the homepage's login widget in HomeClient.tsx
// every time one got a feature the other didn't. Redirecting here guarantees they're literally
// the same page — no separate design or logic to keep in sync going forward.
export default function CorporateLoginPage() {
  redirect('/');
}
