import type { ReactNode } from "react";

interface ToolSectionProps {
  title: string;
  description?: string;
  status?: string;
  children: ReactNode;
  className?: string;
}

export default function ToolSection({
  title,
  description,
  status,
  children,
  className = "",
}: ToolSectionProps) {
  return (
    <details className={`cp-tool-section ${className}`}>
      <summary className="cp-tool-summary">
        <span className="cp-tool-heading">
          <span className="cp-tool-title">{title}</span>

          {status && <span className="cp-tool-status">{status}</span>}
        </span>

        {description && (
          <span className="cp-tool-description">{description}</span>
        )}
      </summary>

      <div className="cp-tool-body">{children}</div>
    </details>
  );
}
