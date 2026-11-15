import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import { CustomerPageFrame, CustomerPageActions } from "@/components/ui/customer-page-layout";
import { GroupReservationContactFields, PaymentAndRemarksFields, emptyReservationForm } from "@/app/reservations/reservation-shared";

function CustomerFormExample() {
  const [booking, setBooking] = useState(() => emptyReservationForm("temporary_requested"));
  const [dirty, setDirty] = useState(false);
  const [checked, setChecked] = useState(false);
  return <main className="min-h-screen">
    <CustomerPageFrame><div className="p-4 sm:p-6">
      <h1 className="mb-6 text-xl font-semibold">お客様情報（表示例）</h1>
      <p className="mb-5 text-sm text-muted-foreground">架空データを使用し、入力を保存・送信しません。</p>
      <div className="grid gap-5" onChange={() => { setDirty(true); setChecked(false); }}>
        <GroupReservationContactFields form={booking} setForm={setBooking} />
        <PaymentAndRemarksFields form={booking} setForm={setBooking} />
      </div>
      {checked && <p role="status" className="mt-5 text-success">入力内容の確認例です。保存・送信は行いません。</p>}
      <CustomerPageActions dirty={dirty} onBack={() => { setBooking(emptyReservationForm("temporary_requested")); setDirty(false); setChecked(false); }}>
        <Button type="button" className="min-h-11" onClick={() => setChecked(true)}>入力内容を確認</Button>
      </CustomerPageActions>
    </div></CustomerPageFrame>
  </main>;
}

const meta = {
  title: "Patterns/CustomerForm", component: CustomerFormExample, tags: ["!autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CustomerFormExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Mobile: Story = { globals: { viewport: { value: "mobile", isRotated: false } } };
export const Narrow: Story = { globals: { viewport: { value: "narrow", isRotated: false } } };
export const KeepInput: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    // CustomerPageActions and Radix dialogs render through portals outside the story root.
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.type(canvas.getByRole("textbox", { name: "予約担当者名" }), "入力保持の確認");
    await userEvent.click(await body.findByRole("button", { name: "お手続きトップへ戻る" }));
    await expect(await body.findByRole("dialog", { name: "入力を破棄して戻りますか？" })).toBeVisible();
    await userEvent.click(body.getByRole("button", { name: "入力を続ける" }));
    await expect(canvas.getByRole("textbox", { name: "予約担当者名" })).toHaveValue("入力保持の確認");
    await expect(body.queryByRole("dialog")).not.toBeInTheDocument();
  },
};
