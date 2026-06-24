type Props = {
  label?: string;
};

export function PageLoading({ label = "Loading…" }: Props) {
  return (
    <div className="kiwami-page min-h-screen flex items-center justify-center">
      <div className="kiwami-container w-full flex flex-col items-center justify-center py-24 gap-4">
        <div className="page-loading-spinner" aria-hidden />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
