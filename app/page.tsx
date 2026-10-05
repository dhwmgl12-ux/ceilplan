import Sidebar from "@/components/layout/Sidebar";
import ProjectHeader from "@/components/layout/ProjectHeader";

export default function Home() {
  return (
    <div id="dashboard" className="min-h-screen lg:pl-48">
      <Sidebar />

      <div className="min-w-0">
        <ProjectHeader />

        <main className="p-4 sm:p-6">
          <div className="grid grid-cols-1 items-start gap-4 min-[1280px]:grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,5fr)]">
            <section
              aria-labelledby="input-title"
              className="min-h-80 min-w-0 rounded-xl border border-slate-200 bg-white p-5"
            >
              <h2 id="input-title" className="text-lg font-bold">
                현장 정보 및 계산 조건
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                현장 정보, 자재 규격, Loss, 단가 입력 영역입니다.
              </p>
            </section>

            <section
              aria-labelledby="preview-title"
              className="min-h-80 min-w-0 rounded-xl border border-slate-200 bg-white p-5"
            >
              <h2 id="preview-title" className="text-lg font-bold">
                천장 미리보기
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                입력한 공간을 표시할 2D SVG 영역입니다.
              </p>
            </section>

            <section
              id="results"
              aria-labelledby="results-title"
              className="min-h-80 min-w-0 rounded-xl border border-slate-200 bg-white p-5"
            >
              <h2 id="results-title" className="text-lg font-bold">
                예상 자재 산출 결과
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                요약, 상세 내역, 예상 금액, 계산 근거 영역입니다.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
