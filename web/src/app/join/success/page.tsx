import { JoinSuccessView } from "./JoinSuccessView";

export default async function SuccessPage(
  props: {
    searchParams: Promise<{ session_id?: string; lightning?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  return (
    <JoinSuccessView
      viaLightning={searchParams.lightning === "1"}
      sessionId={searchParams.session_id}
    />
  );
}
