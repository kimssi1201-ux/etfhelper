import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-16">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">404</p>
        <h1 className="mt-2 text-2xl font-bold text-zinc-950">지원하지 않는 종목입니다</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          현재 XOM, JEPI, JEPQ, SCHD, QQQI의 배당 계산 페이지를 제공하고 있습니다.
        </p>
        <Link
          href="/xom"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          XOM 계산기 열기
        </Link>
      </section>
    </main>
  );
}
