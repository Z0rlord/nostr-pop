import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { QuickStartSteps } from "@/components/QuickStartSteps";
import { HowItWorks } from "@/components/HowItWorks";
import { ForInstructors } from "@/components/ForInstructors";
import { MembershipBenefits } from "@/components/MembershipBenefits";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <QuickStartSteps />
        <HowItWorks />
        <ForInstructors />
        <MembershipBenefits />
      </main>
      <Footer />
    </>
  );
}
