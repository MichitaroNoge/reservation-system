import { readdirSync } from "node:fs";
import { join } from "node:path";

/** Discover current source files, rather than executing stale compiled tests or a fixed DB list. */
export function testFiles(directory: string) {
  const files = readdirSync(directory).filter(name => name.endsWith(".test.ts")).sort().map(name => join(directory, name));
  if (!files.length) throw new Error(`No tests found in ${directory}`);
  return files;
}
