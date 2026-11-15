import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge } from "./badge";

const meta = {
  title: "UI/Badge", component: Badge,
  args: { children: "状態" },
  argTypes: { variant: { control: "select", options: ["default", "secondary", "success", "warning", "destructive", "outline"] } },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Success: Story = { args: { variant: "success", children: "確認済み" } };
export const Warning: Story = { args: { variant: "warning", children: "確認待ち" } };
export const Destructive: Story = { args: { variant: "destructive", children: "取得失敗" } };
