interface PendingInputNoticeProps {
  visible: boolean;
  label: string;
}

export default function PendingInputNotice({
  visible,
  label,
}: PendingInputNoticeProps) {
  if (!visible) return null;

  return (
    <div
      role="status"
      className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
    >
      <p className="text-xs font-semibold text-amber-900">
        {label}에 미적용 입력이 있습니다
      </p>

      <p className="mt-1 text-[11px] leading-5 text-amber-800">
        추가·수정 적용을 눌러야 프로젝트에 반영됩니다. 현재 입력은 프로젝트
        저장·JSON·자동 임시저장에 포함되지 않습니다. 공간·프로젝트 전환이나
        편집기 초기화 시 사라질 수 있습니다.
      </p>
    </div>
  );
}
