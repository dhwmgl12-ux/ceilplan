export function downloadText(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    link.remove();

    // 브라우저가 다운로드를 시작한 다음 해제합니다.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
