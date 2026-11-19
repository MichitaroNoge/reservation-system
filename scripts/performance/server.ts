import { createServer, request as proxyRequest } from "node:http";
import { readdir } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { performanceFixture } from "./fixture";
import { validationEnvironment } from "../validation-environment";
import { fixtureToken } from "./tokens";

async function main() {
  const mode = process.argv[2] ?? "production", size = Number(process.argv[3] ?? 1000);
  if (!["development", "production"].includes(mode)) throw new Error("Use development or production.");
  const fixture = await performanceFixture(size);
  const visualCleanup = process.argv.includes("--visual") ? await (await import("../visual-audit-fixture")).seedVisualAudit(fixture.repo) : undefined;
  const root = resolve("app/api");
  const files = (await readdir(root, { recursive: true })).filter(file => file.endsWith(`${sep}route.ts`));
  const routes = files.map(file => {
    const parts = relative(resolve("app"), resolve(root, file)).split(sep).slice(0, -1);
    const keys: string[] = [];
    const expression = parts.map(part => part.startsWith("[") ? (keys.push(part.slice(1, -1)), "([^/]+)") : part).join("/");
    return { file: resolve(root, file), expression: new RegExp(`^/${expression}/?$`), keys };
  }).sort((a, b) => a.keys.length - b.keys.length);
  const timings: { path: string; ms: number; status: number }[] = [];
  const env: NodeJS.ProcessEnv = { ...validationEnvironment(), NODE_ENV: mode === "production" ? "production" : "development", RESERVATION_VALIDATION_BUILD: mode === "production" ? "1" : "" };
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", mode === "production" ? "start" : "dev", "--hostname", "127.0.0.1", "--port", "3311"], { stdio: "inherit", env });
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1:3310");
      if (url.pathname === "/__performance") {
        res.setHeader("content-type", "application/json");
        return res.end(JSON.stringify({ size, mode, timings, memory: process.memoryUsage() }));
      }
      if (!url.pathname.startsWith("/api/")) {
        const upstream = proxyRequest({ hostname: "127.0.0.1", port: 3311, path: req.url, method: req.method, headers: req.headers }, response => {
          res.writeHead(response.statusCode ?? 502, response.headers);
          response.pipe(res);
        });
        upstream.on("error", () => { res.statusCode = 503; res.end("Next server is starting"); });
        req.pipe(upstream);
        return;
      }
      const route = routes.find(route => route.expression.test(url.pathname));
      if (!route) { res.statusCode = 404; res.end(); return; }
      const routeModule = await import(pathToFileURL(route.file).href);
      const handler = routeModule[req.method ?? "GET"] as (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>;
      if (!handler) { res.statusCode = 405; res.end(); return; }
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(",") : value);
      // Only these exact synthetic tokens are mapped to the fixture's mocked identity verifier.
      for (const admin of [false, true]) if (headers.get("authorization") === `Bearer ${fixtureToken(admin)}`) headers.set("authorization", admin ? "Bearer calendar-test-admin" : "Bearer calendar-test-member");
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = Buffer.concat(chunks);
      const request = new Request(url, { method: req.method, headers, ...(!["GET", "HEAD"].includes(req.method ?? "GET") ? { body } : {}) });
      const values = route.expression.exec(url.pathname)!;
      const params = Object.fromEntries(route.keys.map((key, index) => [key, decodeURIComponent(values[index + 1])]));
      const start = performance.now();
      const response = await handler(request, { params: Promise.resolve(params) });
      const duration = performance.now() - start;
      timings.push({ path: url.pathname, ms: duration, status: response.status });
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.setHeader("server-timing", `application;dur=${duration.toFixed(2)}`);
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) { console.error(error); res.statusCode = 500; res.end("Isolated performance server failed"); }
  });
  server.listen(3310, "127.0.0.1", () => console.log(`Performance fixture (${mode}, ${size} rows): http://127.0.0.1:3310`));
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    child.kill(); server.close(); visualCleanup?.(); await fixture.close();
  };
  child.on("exit", () => { void close(); });
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => { void close(); });
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
