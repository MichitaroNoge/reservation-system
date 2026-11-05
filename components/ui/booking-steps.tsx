import { Check } from "lucide-react";

const labels = ["利用者区分", "予約種別", "日時・人数", "お客様情報", "受付完了"];
export function BookingSteps({ currentStep }: { currentStep: number }) {
  return <ol aria-label="予約申請の手順" className="grid min-w-0 grid-cols-5 items-start gap-2 border-b border-border bg-background/40 px-3 py-4 sm:px-5">{labels.map((label, index) => <li key={label} aria-current={currentStep === index + 1 ? "step" : undefined} className="min-w-0 text-center"><span className={"inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold " + (currentStep >= index + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{currentStep > index + 1 ? <><Check aria-hidden="true" className="size-4"/><span className="sr-only">{index + 1} 完了</span></> : index + 1}</span><span className={"mt-2 block break-words text-xs leading-5 " + (currentStep === index + 1 ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span></li>)}</ol>;
}
