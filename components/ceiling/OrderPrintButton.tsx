"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CalculationSnapshot, MaterialId } from "@/types/ceilplan";

interface OrderPrintButtonProps {
  snapshot: CalculationSnapshot | null;
  stale: boolean;
}

interface PrintSession {
  source: CalculationSnapshot;
  document: CalculationSnapshot;
}

function quantity(value: number) {
  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: 3,
  });
}

function money(value: number | null) {
  if (value === null) return "단가 미입력";

  return `${value.toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
  })}원`;
}

function specification(snapshot: CalculationSnapshot, materialId: MaterialId) {
  const input = snapshot.materialInput;

  if (materialId === "BOARD") {
    return `${input.boardWidthMm} × ${input.boardLengthMm} mm`;
  }

  const length =
    materialId === "MBAR"
      ? input.mbarStockLengthMm
      : input.carryingStockLengthMm;

  return `정척 ${length} mm`;
}

interface PrintDialogProps {
  document: CalculationSnapshot;
  invalid: boolean;
  onClose: () => void;
}

function PrintDialog({
  document: snapshot,
  invalid,
  onClose,
}: PrintDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const input = snapshot.materialInput;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = window.document.activeElement;

    dialog?.showModal();

    return () => {
      dialog?.close();

      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  function print() {
    if (invalid) return;
    window.print();
  }

  return createPortal(
    <div id="ceilplan-order-print-root">
      <dialog
        ref={dialogRef}
        aria-labelledby="order-print-title"
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        className="order-print-dialog"
      >
        <div className="order-print-toolbar">
          <p className="text-sm font-semibold">발주 검토용 보기</p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={print}
              disabled={invalid}
              className="cp-button-primary"
            >
              인쇄 / PDF 저장
            </button>

            <button
              type="button"
              onClick={onClose}
              className="cp-button-secondary"
            >
              닫기
            </button>
          </div>
        </div>

        {invalid && (
          <p role="alert" className="order-print-invalid">
            입력 또는 계산 결과가 변경되었습니다. 이 문서를 닫고 다시 계산한 뒤
            발주용 보기를 여세요.
          </p>
        )}

        <article
          className={`order-print-sheet ${
            invalid ? "order-print-sheet-invalid" : ""
          }`}
        >
          <header>
            <p className="order-print-brand">CeilPlan</p>

            <h1 id="order-print-title">천장 자재 예상 발주 내역</h1>

            <p className="order-print-subtitle">
              공간 한 개 기준 · VAT 별도 · 발주 전 검토용
            </p>
          </header>

          <dl className="order-print-meta">
            <div>
              <dt>현장·공간명</dt>
              <dd>{snapshot.siteInput.name}</dd>
            </div>

            <div>
              <dt>계산 면적</dt>
              <dd>{quantity(snapshot.result.areaM2)} ㎡</dd>
            </div>

            <div>
              <dt>천장 방식</dt>
              <dd>M-BAR + 석고보드</dd>
            </div>

            <div>
              <dt>계산 시각</dt>
              <dd>
                {new Date(snapshot.calculatedAt).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })}
                {" (한국 시간)"}
              </dd>
            </div>

            <div className="order-print-full">
              <dt>계산 정책 버전</dt>
              <dd>{snapshot.calculationRuleVersion}</dd>
            </div>
          </dl>

          <h2>예상 발주 수량·금액</h2>

          <p className="order-print-note">
            아래 수량은 Loss와 구매 단위 올림이 반영된 값입니다.
          </p>

          <div className="order-print-table-scroll">
            <table>
              <caption className="sr-only">
                자재별 규격, 발주 수량, 단가와 예상 금액
              </caption>

              <thead>
                <tr>
                  <th scope="col">자재</th>
                  <th scope="col">구매 규격</th>
                  <th scope="col">발주 수량</th>
                  <th scope="col">단가</th>
                  <th scope="col">예상 금액</th>
                </tr>
              </thead>

              <tbody>
                {snapshot.result.materials.map((material) => (
                  <tr key={material.id}>
                    <th scope="row">{material.name}</th>

                    <td>{specification(snapshot, material.id)}</td>

                    <td>
                      {quantity(material.orderQuantity)} {material.purchaseUnit}
                      {material.id !== "BOARD" && (
                        <span className="order-print-secondary">
                          총 {quantity(material.orderedQuantity)} m
                        </span>
                      )}
                    </td>

                    <td>
                      {money(material.unitPrice)}
                      {material.unitPrice !== null && (
                        <span className="order-print-secondary">
                          / {material.purchaseUnit}
                        </span>
                      )}
                    </td>

                    <td>{money(material.estimatedCost)}</td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <th scope="row" colSpan={4}>
                    합계 예상 자재비
                  </th>
                  <td>
                    {snapshot.result.totalEstimatedCost === null
                      ? "단가 미입력으로 합계 미완성"
                      : money(snapshot.result.totalEstimatedCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <h2>계산 조건</h2>

          <dl className="order-print-meta">
            <div>
              <dt>M-BAR 간격</dt>
              <dd>{input.mbarSpacingMm} mm</dd>
            </div>

            <div>
              <dt>캐링 간격</dt>
              <dd>{input.carryingSpacingMm} mm</dd>
            </div>

            <div>
              <dt>석고보드 겹수</dt>
              <dd>{input.layerCount}겹</dd>
            </div>

            <div>
              <dt>석고보드 Loss</dt>
              <dd>{input.boardLossPercent}%</dd>
            </div>

            <div>
              <dt>금속 자재 Loss</dt>
              <dd>{input.metalLossPercent}%</dd>
            </div>

            <div>
              <dt>현장 조정값</dt>
              <dd>{snapshot.adjustments.length}건 반영</dd>
            </div>
          </dl>

          <footer className="order-print-footer">
            <p>
              면적 기반 예상 물량입니다. 실제 배치·절단·잔재 재사용을 최적화한
              수량이 아닙니다.
            </p>

            <p>
              현장 요소는 등록만으로 자동 공제·보강하지 않으며, 사용자가 입력한
              조정값만 반영합니다.
            </p>

            <p>
              이 문서는 석고보드·M-BAR·캐링의 예상 자재비를 표시합니다. 기타
              자재·노무비·운반비는 포함하지 않습니다.
            </p>

            <p>실제 발주 전 규격·수량·단가와 현장 조건을 확인하세요.</p>
          </footer>
        </article>
      </dialog>
    </div>,
    window.document.body,
  );
}

export default function OrderPrintButton({
  snapshot,
  stale,
}: OrderPrintButtonProps) {
  const [session, setSession] = useState<PrintSession | null>(null);

  function open() {
    if (!snapshot || stale) return;

    setSession({
      source: snapshot,
      document: structuredClone(snapshot),
    });
  }

  const invalid = Boolean(session && (stale || snapshot !== session.source));

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={!snapshot || stale}
        className="cp-button-secondary"
      >
        발주용 보기 / 인쇄
      </button>

      {session && (
        <PrintDialog
          document={session.document}
          invalid={invalid}
          onClose={() => setSession(null)}
        />
      )}
    </>
  );
}
