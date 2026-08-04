import type { Metadata } from 'next';
import { getMetadataFor } from '@/app/lib/seo';
import ForgotPasswordClient from './ForgotPasswordClient';

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataFor('forgot-password', '/forgot-password');
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
