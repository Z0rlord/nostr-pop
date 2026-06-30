import { JoinSuccessView } from "./JoinSuccessView";

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string; lightning?: string };
}) {
  return (
    <JoinSuccessView
      viaLightning={searchParams.lightning === "1"}
      sessionId={searchParams.session_id}
    />
  );
}
