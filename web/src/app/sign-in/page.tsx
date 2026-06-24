import { redirect } from "next/navigation";

/** Canonical sign-in URL — same account page as /practice */
export default function SignInPage() {
  redirect("/practice");
}
