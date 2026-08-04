import type { Metadata } from 'next';
import { getMetadataFor } from '@/app/lib/seo';
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from '@/app/lib/jsonLd';
import PartnerUsClient from './PartnerUsClient';

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataFor('partner-us', '/partner-us');
}

export default function PartnerUsPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Partner With Us', path: '/partner-us' }])} />
      <JsonLd data={webPageJsonLd({ name: 'Partner With Shree Kalyanam', description: 'Explore corporate travel partnership opportunities with Shree Kalyanam.', path: '/partner-us' })} />
      <PartnerUsClient />
    </>
  );
}
