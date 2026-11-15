import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { FormField } from "./form-field";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Button } from "./button";

const meta = {
  title: "UI/FormField", component: FormField,
  args: { label: "お名前", children: <Input placeholder="お名前を入力" /> },
  decorators: [(Story) => <div className="max-w-customer-form"><Story /></div>],
  parameters: { docs: { description: { component: "ラベル・必須・項目エラーと入力欄のid、aria属性を共用します。" } } },
} satisfies Meta<typeof FormField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Error: Story = { args: { required: true, error: "お名前を入力してください。" } };
export const TextareaError: Story = { args: { label: "内容", required: true, error: "内容を入力してください。", children: <Textarea /> } };

const schema = z.object({ name: z.string().trim().min(1, "お名前を入力してください。"), body: z.string().trim().min(1, "内容を入力してください。") });
function ValidatedForm() {
  const [saved, setSaved] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: "", body: "" } });
  return <form noValidate className="grid gap-5" onChange={() => setSaved(false)} onSubmit={form.handleSubmit(() => setSaved(true))}>
    <FormField label="お名前" required error={form.formState.errors.name?.message}><Input {...form.register("name")} /></FormField>
    <FormField label="内容" required error={form.formState.errors.body?.message}><Textarea {...form.register("body")} /></FormField>
    <Button type="submit" className="justify-self-start">入力を確認</Button>
    {saved && <p role="status" className="text-success">入力を確認しました（保存・送信は行いません）。</p>}
  </form>;
}

export const ValidationFlow: Story = {
  render: () => <ValidatedForm />,
  parameters: { controls: { disable: true }, docs: { description: { story: "既存カタログから移したReact Hook Form・Zodの使用例。実データは保存・送信しません。" } } },
  play: async ({ canvas, userEvent, step }) => {
    await step("空欄のエラーと入力欄の関連付け", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "入力を確認" }));
      await expect(await canvas.findByText("お名前を入力してください。")).toBeVisible();
      await expect(canvas.getByRole("textbox", { name: "お名前 必須" })).toHaveAttribute("aria-invalid", "true");
      await expect(canvas.getByRole("textbox", { name: "内容 必須" })).toHaveAttribute("aria-invalid", "true");
    });
    await step("入力を修正して成功表示", async () => {
      await userEvent.type(canvas.getByRole("textbox", { name: "お名前 必須" }), "確認用サンプル");
      await userEvent.type(canvas.getByRole("textbox", { name: "内容 必須" }), "既存のデザインを維持した入力例");
      await userEvent.click(canvas.getByRole("button", { name: "入力を確認" }));
      await expect(await canvas.findByRole("status")).toHaveTextContent("入力を確認しました");
    });
  },
};
