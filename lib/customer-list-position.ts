export function parseCustomerListPosition(value: string | null): { page: number; scroll: number } {
  try {
    const position = JSON.parse(value ?? "null");
    return {
      page: Number.isSafeInteger(position?.page) && position.page >= 1 && position.page <= 100000 ? position.page : 1,
      scroll: typeof position?.scroll === "number" && Number.isFinite(position.scroll) && position.scroll >= 0 && position.scroll <= 10000000 ? position.scroll : 0,
    };
  } catch { return { page: 1, scroll: 0 }; }
}
