export default function Loading() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-[#FFF8EF]">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#E9DCCB] border-t-[#B8893B]" />
        <p className="eyebrow mt-5">Preparing the collection...</p>
      </div>
    </main>
  );
}
