import type { Metadata } from 'next';
import { getMetadataFor } from '@/app/lib/seo';
import ResetPasswordClient from './ResetPasswordClient';

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataFor('reset-password', '/reset-password');
}

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
