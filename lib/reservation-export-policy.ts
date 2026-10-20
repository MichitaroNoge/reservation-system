export const exportMaxRows = 10000;
export const exportMaxBytes = 20 * 1024 * 1024;
export const exportMaxScanned = 50000;
export const exportBatchSize = 500;
export const exportTimeoutMs = 30000;
export class ExportError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}
export function checkExportDeadline(signal: AbortSignal, deadline: number) {
  if (signal.aborted || Date.now() >= deadline) throw new ExportError(504, "TIMEOUT", "出力処理が時間制限を超えたか中断されました。条件を絞って再実行してください。");
}
