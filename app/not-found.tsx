import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="cp-card w-full max-w-md text-center">
        <p className="text-sm font-semibold text-blue-600">404</p>

        <h1 className="mt-3 text-2xl font-bold">페이지를 찾을 수 없습니다</h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          주소를 확인하거나 대시보드로 이동해 주세요.
        </p>

        <Link href="/" className="cp-button-primary mt-6">
          대시보드로 이동
        </Link>
      </section>
    </main>
  );
}
