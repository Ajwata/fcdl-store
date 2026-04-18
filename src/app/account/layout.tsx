import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCmsContent } from "@/lib/cms-content";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const cms = await getCmsContent();

  return (
    <>
      <SiteHeader navigationItems={cms.navigationItems} />
      <div className="pt-[76px]">{children}</div>
      <SiteFooter
        footerNavLinks={cms.footerNavLinks}
        footerDocLinks={cms.footerDocLinks}
        footerSocialLinks={cms.footerSocialLinks}
        footerContent={cms.footerContent}
        logoUrl={cms.logoUrl}
        siteName={cms.siteName}
      />
    </>
  );
}
