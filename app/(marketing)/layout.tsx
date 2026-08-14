import Nav from '../components/Nav';
import Footer from '../components/Footer';
import { JsonLd, organizationJsonLd, websiteJsonLd } from '@/app/lib/jsonLd';
import { getSystemSettingValue } from '@/app/lib/systemSettings';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const companyName = (await getSystemSettingValue('company_name')) ?? undefined;

  return (
    <>
      {/* Site-wide schema for the public marketing site only — never emitted on the
       * authenticated corporate app, which has its own (noindex) layout. */}
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <Nav />
      <main style={{ paddingTop: 64 }}>{children}</main>
      <Footer companyName={companyName} />
    </>
  );
}
