"use client";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cancellationPolicyText } from "@/lib/cancellation-policy-consent";
export function CancellationPolicyAgreement({ checked, onChange, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  const id = useId();
  const [heading, ...paragraphs] = cancellationPolicyText.split("\n\n");
  return <section className="mt-6 space-y-4 border-t border-border pt-5" aria-labelledby={id + "-heading"}>
    <h3 id={id + "-heading"} className="text-base font-semibold">{heading}</h3>
    <p className="text-sm text-muted-foreground">本予約が完了した後の取り消し・減員に適用されます。</p>
    <div className="space-y-3 text-sm leading-relaxed">{paragraphs.map((paragraph, index) => <p className={index < 2 ? "font-semibold" : undefined} key={paragraph}>{paragraph}</p>)}</div>
    <div className="flex items-start gap-3 rounded-md border border-input p-3"><Input className="mt-0.5 size-4 shrink-0" id={id} type="checkbox" required checked={checked} disabled={disabled} aria-describedby={id + "-help"} onChange={event => onChange(event.target.checked)} /><Label className="cursor-pointer text-sm leading-relaxed" htmlFor={id}>キャンセルポリシーを確認し、同意します<span className="ml-2 text-xs text-destructive">必須</span></Label></div>
    {!checked && <p id={id + "-help"} className="text-sm text-muted-foreground">申請するには、上記のキャンセルポリシーへの同意が必要です。</p>}
  </section>;
}
