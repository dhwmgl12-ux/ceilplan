export type WorkspaceTab = "SETUP" | "EDIT" | "REVIEW";

interface WorkspaceTabsProps {
  activeTab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
}

const tabs: {
  id: WorkspaceTab;
  label: string;
  description: string;
}[] = [
  {
    id: "SETUP",
    label: "공간·자재 설정",
    description: "공간 치수와 계산 조건",
  },
  {
    id: "EDIT",
    label: "요소 편집",
    description: "요소 배치·속성·조정값",
  },
  {
    id: "REVIEW",
    label: "산출 검토",
    description: "수량·금액·계산 근거",
  },
];

export default function WorkspaceTabs({
  activeTab,
  onChange,
}: WorkspaceTabsProps) {
  return (
    <nav aria-label="작업 화면 선택" className="cp-task-navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-pressed={activeTab === tab.id}
          aria-controls="workspace-content"
          className="cp-task-tab"
        >
          <span className="font-semibold">{tab.label}</span>

          <span className="hidden text-[11px] sm:block">{tab.description}</span>
        </button>
      ))}
    </nav>
  );
}
