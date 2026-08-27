import { ScanEye } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-mark">
      {/* Lucide keeps the compact brand mark crisp at every density. */}
      <span className="brand-mark__icon"><ScanEye size={21} strokeWidth={1.7} aria-hidden="true" /></span>
      {!compact && <span>OcuComfort</span>}
    </span>
  );
}
