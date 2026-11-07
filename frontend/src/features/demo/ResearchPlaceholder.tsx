export function ResearchPlaceholder({ label, compact = false }: { label: string; compact?: boolean }) {
  return <div className={"demo-research-placeholder" + (compact ? " demo-research-placeholder-compact" : "")} role="img" aria-label={label}>
    <span aria-hidden="true">占位</span>
  </div>;
}
