import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { reservationStatuses, reservationStatusLabel } from "@/lib/domain";
import { ReservationStatusBadge } from "./reservation-status-badge";

const meta = {
  title: "UI/ReservationStatusBadge", component: ReservationStatusBadge,
  args: { status: "temporary_requested" },
  argTypes: { status: { control: "select", options: reservationStatuses } },
  render: ({ status, ...args }) => <ReservationStatusBadge {...args} status={status}>{reservationStatusLabel(status)}</ReservationStatusBadge>,
  parameters: { docs: { description: { component: "既存の予約状態の配色を維持します。期限切れ等の表示文言は呼び出し元の業務ヘルパーで判定します。" } } },
} satisfies Meta<typeof ReservationStatusBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AllStatuses: Story = {
  render: () => <div className="flex flex-wrap gap-3">{reservationStatuses.map(status => <ReservationStatusBadge key={status} status={status}>{reservationStatusLabel(status)}</ReservationStatusBadge>)}</div>,
};
export const ExpiredTemporary: Story = {
  args: { status: "temporary_confirmed" },
  render: (args) => <ReservationStatusBadge {...args}>仮予約確定（期限切れ）</ReservationStatusBadge>,
};
