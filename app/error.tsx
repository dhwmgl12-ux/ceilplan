"use client";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section
        aria-labelledby="error-title"
        className="cp-card w-full max-w-md text-center"
      >
        <h1 id="error-title" className="text-2xl font-bold">
          화면을 표시하지 못했습니다
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          다시 시도해 주세요. 저장하지 않은 입력은 복구되지 않을 수 있습니다.
        </p>

        <button
          type="button"
          onClick={reset}
          className="cp-button-primary mt-6"
        >
          다시 시도
        </button>
      </section>
    </main>
  );
}
