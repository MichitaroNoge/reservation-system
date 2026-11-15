import { readdirSync } from "node:fs";
import { join } from "node:path";

/** Discover current source files, rather than executing stale compiled tests or a fixed DB list. */
export function testFiles(directory: string) {
  const files = readdirSync(directory).filter(name => name.endsWith(".test.ts")).sort().map(name => join(directory, name));
  if (!files.length) throw new Error(`No tests found in ${directory}`);
  return files;
}

/** Optional scope accepts only discovered test sources; it never accepts flags or arbitrary scripts. */
export function selectedTestFiles(directory: string, selected: string[]) {
  const available = testFiles(directory);
  if (!selected.length) return available;
  const normalize = (value: string) => value.replaceAll("\\", "/").replace(/^\.\//, "");
  const choices = new Map(available.map(file => [normalize(file), file]));
  return [...new Set(selected)].map(file => {
    const found = choices.get(normalize(file));
    if (!found) throw new Error(`Not a discovered ${directory} test: ${file}`);
    return found;
  });
}
