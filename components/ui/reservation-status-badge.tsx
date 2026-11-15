import type { ComponentProps } from "react";
import type { ReservationStatus } from "../../lib/domain";
import { Badge } from "./badge";
import { cn } from "../../lib/utils";

const tones = {
  warning: "bg-status-warning-background text-status-warning",
  primary: "bg-status-primary-background text-status-primary",
  pending: "bg-status-pending-background text-status-pending",
  success: "bg-status-success-background text-status-success",
  info: "bg-status-info-background text-status-info",
  neutral: "bg-status-neutral-background text-status-neutral",
  destructive: "bg-status-destructive-background text-status-destructive",
};

export const reservationStatusTones = {
  temporary_requested: "warning",
  temporary_confirmed: "primary",
  temporary_rejected: "destructive",
  confirmed_requested: "pending",
  confirmed: "success",
  confirmed_rejected: "destructive",
  waiting_for_visit: "info",
  visited: "neutral",
  cancellation_requested: "destructive",
  cancelled: "destructive",
} as const satisfies Record<ReservationStatus, keyof typeof tones>;

/** Keeps the existing reservation palette and density in one shared component. */
export function StatusBadge({ tone, className, children, ...props }: ComponentProps<"span"> & { tone: keyof typeof tones }) {
  return <Badge {...props} variant="outline" data-ui="status-badge" className={cn("gap-[5px] whitespace-nowrap rounded-[12px] border-0 px-[9px] py-[5px] font-normal leading-[1.55]", tones[tone], className)}>
    <span aria-hidden="true" className="size-[5px] shrink-0 rounded-full bg-current" />{children}
  </Badge>;
}

export function ReservationStatusBadge({ status, ...props }: ComponentProps<"span"> & { status: ReservationStatus }) {
  return <StatusBadge {...props} tone={reservationStatusTones[status]} />;
}
