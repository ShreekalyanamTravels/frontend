import type { Metadata } from 'next';
import { getMetadataFor } from '@/app/lib/seo';
import { JsonLd, webPageJsonLd } from '@/app/lib/jsonLd';
import HomeClient from './HomeClient';

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataFor('home', '/');
}

export default function HomePage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({ name: 'Shree Kalyanam', description: "India's trusted corporate travel management partner.", path: '/' })} />
      <HomeClient />
    </>
  );
}
