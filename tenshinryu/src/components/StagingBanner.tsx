export function StagingBanner() {
  const isStaging =
    process.env.APP_ENV === "staging" ||
    process.env.NEXT_PUBLIC_APP_URL?.includes("staging.");

  if (!isStaging) return null;

  return (
    <div className="staging-banner" role="status">
      STAGING — changes here are not live on tenshinryu.xyz
    </div>
  );
}
