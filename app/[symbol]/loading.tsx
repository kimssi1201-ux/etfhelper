export default function StockPageLoading() {
  return (
    <main
      className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6"
      aria-busy="true"
      aria-label="주식 정보를 불러오는 중"
    >
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-zinc-200" />
        <div className="h-6 w-28 animate-pulse rounded-md bg-zinc-200" />
      </div>
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="h-5 w-24 animate-pulse rounded bg-zinc-200" />
        <div className="mt-3 h-9 w-52 animate-pulse rounded bg-zinc-200" />
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-zinc-100" />
          ))}
        </div>
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-zinc-100" />
      </section>
      <p className="mt-5 text-center text-sm text-zinc-500" role="status">
        최신 시세와 배당 이력을 확인하고 있습니다.
      </p>
    </main>
  );
}
