import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { reservationStatusLabel } from "@/lib/domain";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ReservationStatusBadge } from "@/components/ui/reservation-status-badge";
import { ListPanel, ListToolbar, ManagementPage, ResultCount } from "@/components/ui/management-layout";
import { ListSearchField } from "@/components/ui/list-search-field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const samples = [
  { id: "DEMO-001", name: "サンプル団体", status: "temporary_requested" as const, people: 30 },
  { id: "DEMO-002", name: "長い名称でも折り返して確認できるサンプルのお客様", status: "confirmed" as const, people: 12 },
];
type Props = { state: "ready" | "loading" | "error" | "empty" };

function ManagementListExample({ state: initialState }: Props) {
  const [state, setState] = useState(initialState);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const rows = samples.filter(row => `${row.id} ${row.name}`.includes(search));
  return <ManagementPage>
    <h1 className="mb-5 text-lg font-semibold">予約一覧（表示例）</h1>
    <ListPanel aria-label="管理一覧の例">
      <ListToolbar>
        <ListSearchField aria-label="サンプル予約を検索" placeholder="予約ID・顧客名で検索" value={search} onChange={event => setSearch(event.target.value)} />
        <ResultCount count={state === "empty" ? 0 : rows.length} loading={state === "loading"} error={state === "error"} />
      </ListToolbar>
      {state === "loading" ? <div role="status" className="grid gap-3 p-5"><span>予約を読み込み中…</span><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
        : state === "error" ? <div className="p-5"><Alert>予約を取得できませんでした。<Button variant="outline" className="ml-3" onClick={() => setState("ready")}>再読み込み</Button></Alert></div>
        : state === "empty" || !rows.length ? <EmptyState title="該当する予約はありません" />
        : <Table>
          <TableHeader><TableRow>{["予約ID", "予約者", "人数", "状態", "操作"].map(label => <TableHead key={label} className={label === "操作" ? "sticky right-0 bg-background" : undefined}>{label}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{rows.map(row => <TableRow key={row.id}>
            <TableCell className="whitespace-nowrap">{row.id}</TableCell><TableCell className="min-w-44">{row.name}</TableCell><TableCell className="whitespace-nowrap">{row.people}名</TableCell>
            <TableCell><ReservationStatusBadge status={row.status}>{reservationStatusLabel(row.status)}</ReservationStatusBadge></TableCell>
            <TableCell className="sticky right-0 bg-card"><Button variant="outline" size="sm" onClick={() => setSelected(row.id)}>詳細を確認</Button></TableCell>
          </TableRow>)}</TableBody>
        </Table>}
    </ListPanel>
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="p-5"><DialogTitle>{selected}</DialogTitle><DialogDescription className="mt-2">架空の予約です。データの変更はありません。</DialogDescription><div className="mt-6 flex justify-end"><Button variant="outline" onClick={() => setSelected(null)}>閉じる</Button></div></DialogContent></Dialog>
  </ManagementPage>;
}

const meta = {
  title: "Patterns/ManagementList", component: ManagementListExample, tags: ["!autodocs"],
  args: { state: "ready" }, parameters: { layout: "fullscreen" },
  // Remount when Controls change the initial request state.
  render: (args) => <ManagementListExample key={args.state} {...args} />,
} satisfies Meta<typeof ManagementListExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { state: "loading" } };
export const Error: Story = { args: { state: "error" } };
export const Empty: Story = { args: { state: "empty" } };
export const Mobile: Story = { globals: { viewport: { value: "mobile", isRotated: false } } };
export const Retry: Story = {
  args: { state: "error" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "再読み込み" }));
    await expect(await canvas.findByRole("table")).toBeVisible();
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};
export const Search: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "サンプル予約を検索" }), "DEMO-002");
    await expect(canvas.getByRole("cell", { name: "DEMO-002" })).toBeVisible();
    await expect(canvas.queryByRole("cell", { name: "DEMO-001" })).not.toBeInTheDocument();
  },
};
