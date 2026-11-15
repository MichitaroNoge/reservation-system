import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FormField } from "./form-field";
import { Select } from "./select";

const meta = {
  title: "UI/Select", component: Select,
  args: { defaultValue: "cash", children: <><option value="cash">現地払い（現金）</option><option value="card">現地払い（クレジットカード）</option><option value="invoice">請求書払い</option></> },
  decorators: [(Story) => <div className="max-w-sm"><FormField label="支払条件"><Story /></FormField></div>],
  parameters: { docs: { description: { component: "モバイルでも端末標準の選択操作ができるネイティブselectを使用します。" } } },
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Invalid: Story = { args: { "aria-invalid": true } };
export const Disabled: Story = { args: { disabled: true } };
