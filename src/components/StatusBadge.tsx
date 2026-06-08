import { statusBadgeClass, statusLabel } from "@/lib/labels";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(
        status,
      )}`}
    >
      {statusLabel(status)}
    </span>
  );
}
