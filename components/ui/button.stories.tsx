import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { LoaderCircle, Search } from "lucide-react";
import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  args: { children: "保存する", variant: "default", size: "default", disabled: false, onClick: fn() },
  argTypes: {
    variant: { control: "select", options: ["default", "outline", "secondary", "ghost", "link", "destructive"] },
    size: { control: "select", options: ["default", "sm", "lg", "icon"] },
  },
  parameters: { docs: { description: { component: "既存の主要操作・戻る操作。通常はモバイル44px、PC42px。" } } },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Outline: Story = { args: { variant: "outline", children: "予約一覧へ戻る" } };
export const Secondary: Story = { args: { variant: "secondary", children: "補助操作" } };
export const Destructive: Story = { args: { variant: "destructive", children: "削除を確定する" } };
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => { await expect(canvas.getByRole("button", { name: "保存する" })).toBeDisabled(); },
};
export const Loading: Story = { args: { disabled: true, "aria-busy": true, children: <><LoaderCircle aria-hidden="true" className="animate-spin" />保存中…</> } };
export const Icon: Story = { args: { variant: "outline", size: "icon", "aria-label": "検索", children: <Search aria-hidden="true" /> } };
