"use client";
import { Button } from "./button";

export function ListPagination({ page, pageSize, total, loading = false, error = false, onPageChange }: { page: number; pageSize: number; total: number; loading?: boolean; error?: boolean; onPageChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div data-ui="list-pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-5 py-4 text-xs"><span role="status" className="text-muted-foreground">{loading ? "読み込み中…" : error ? "件数を確認できません" : total + "件中 " + (total ? (page - 1) * pageSize + 1 : 0) + "〜" + Math.min(page * pageSize, total) + "件"}</span><nav aria-label="ページ切り替え" className="ml-auto flex items-center gap-3"><Button type="button" size="sm" variant="outline" disabled={loading || error || page <= 1} onClick={() => onPageChange(page - 1)}>前へ</Button><span aria-label="現在のページ">{page} / {pages}</span><Button type="button" size="sm" variant="outline" disabled={loading || error || page >= pages} onClick={() => onPageChange(page + 1)}>次へ</Button></nav></div>;
}
