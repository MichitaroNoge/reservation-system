import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FormField } from "./form-field";
import { Textarea } from "./textarea";

const meta = {
  title: "UI/Textarea", component: Textarea,
  args: { placeholder: "お問い合わせ内容を入力", maxLength: 5000 },
  decorators: [(Story) => <div className="max-w-customer-form"><FormField label="お問い合わせ内容"><Story /></FormField></div>],
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Invalid: Story = { args: { "aria-invalid": true } };
export const Disabled: Story = { args: { disabled: true } };
export const ReadOnly: Story = { args: { readOnly: true, value: "保存したお問い合わせです。\n改行も維持します。" } };
export const LongText: Story = { args: { defaultValue: "長い内容を入力する場合も本文と操作欄を確認できます。\n".repeat(10) } };
