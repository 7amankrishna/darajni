export default function Loading() {
  return (
    <main className="grid min-h-[70vh] place-items-center">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#caaa70]" />
        <p className="eyebrow mt-5">Preparing the collection…</p>
      </div>
    </main>
  );
}
