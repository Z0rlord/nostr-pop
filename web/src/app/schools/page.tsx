import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SchoolsPageContent } from "@/components/SchoolsPageContent";
import { listAffiliatedSchoolsPublic } from "@/lib/affiliated-schools-server";

export const dynamic = "force-dynamic";

export default async function AffiliatedSchoolsPage() {
  const schools = await listAffiliatedSchoolsPublic();

  return (
    <>
      <Header />
      <main className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <SchoolsPageContent schools={schools} />
        </div>
      </main>
      <Footer />
    </>
  );
}
