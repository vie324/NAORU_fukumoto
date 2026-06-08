export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div
        className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-brand"
        role="status"
        aria-label="読み込み中"
      />
    </div>
  );
}
