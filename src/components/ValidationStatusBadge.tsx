import type { ValidationStatus } from "@/lib/validation/schema";
import { VALIDATION_STATUS_LABELS } from "@/lib/validation/proof";

interface ValidationStatusBadgeProps {
  status: ValidationStatus;
}

export function ValidationStatusBadge({
  status,
}: ValidationStatusBadgeProps) {
  return (
    <span className={`status-pill validation-status-pill validation-status-${status}`}>
      {VALIDATION_STATUS_LABELS[status]}
    </span>
  );
}
