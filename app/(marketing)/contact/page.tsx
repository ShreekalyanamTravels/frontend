import type { Metadata } from 'next';
import { getMetadataFor } from '@/app/lib/seo';
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from '@/app/lib/jsonLd';
import ContactClient from './ContactClient';

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataFor('contact', '/contact');
}

export default function ContactPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Contact Us', path: '/contact' }])} />
      <JsonLd data={webPageJsonLd({ name: 'Contact Shree Kalyanam', description: "Get in touch with Shree Kalyanam's corporate travel team.", path: '/contact', schemaType: 'ContactPage' })} />
      <ContactClient />
    </>
  );
}
