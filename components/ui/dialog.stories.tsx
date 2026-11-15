import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./dialog";

function DialogExample({ initiallyOpen = false, long = false }: { initiallyOpen?: boolean; long?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline">詳細を確認</Button></DialogTrigger>
    <DialogContent className="p-5">
      <DialogTitle>予約内容の確認</DialogTitle>
      <DialogDescription className="mt-2">共通ダイアログの表示例です。データの変更はありません。</DialogDescription>
      {long && <div className="mt-4 space-y-4 text-sm">{Array.from({ length: 20 }, (_, index) => <p key={index}>確認項目 {index + 1}：長い内容は内部をスクロールして確認できます。</p>)}</div>}
      <div className="mt-6 flex justify-end"><Button variant="outline" onClick={() => setOpen(false)}>閉じる</Button></div>
    </DialogContent>
  </Dialog>;
}

const meta = { title: "UI/Dialog", component: DialogContent, render: () => <DialogExample /> } satisfies Meta<typeof DialogContent>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Open: Story = { tags: ["!autodocs"], render: () => <DialogExample initiallyOpen /> };
export const LongContent: Story = { tags: ["!autodocs"], render: () => <DialogExample initiallyOpen long /> };
export const KeyboardClose: Story = {
  tags: ["!autodocs"],
  play: async ({ canvas, canvasElement, userEvent, step }) => {
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "詳細を確認" });
    await step("詳細を開く", async () => {
      await userEvent.click(trigger);
      await expect(await body.findByRole("dialog", { name: "予約内容の確認" })).toBeVisible();
    });
    await step("Escapeで閉じて元の操作へ戻る", async () => {
      await userEvent.keyboard("{Escape}");
      await expect(body.queryByRole("dialog")).not.toBeInTheDocument();
      await expect(trigger).toHaveFocus();
    });
  },
};
