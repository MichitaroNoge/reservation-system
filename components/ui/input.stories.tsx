import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FormField } from "./form-field";
import { Input } from "./input";

const meta = {
  title: "UI/Input", component: Input,
  args: { placeholder: "お名前を入力", autoComplete: "off" },
  decorators: [(Story, context) => <div className="max-w-sm"><FormField label={context.args.type === "number" ? "人数" : "お名前"}><Story /></FormField></div>],
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Invalid: Story = { args: { "aria-invalid": true } };
export const Disabled: Story = { args: { disabled: true, defaultValue: "変更不可" } };
export const ReadOnly: Story = { args: { readOnly: true, value: "保存済みのお名前" } };
export const Number: Story = { args: { type: "number", inputMode: "numeric", min: 1, max: 999, defaultValue: 30, placeholder: "" } };
