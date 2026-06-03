import { mkdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const targetUrl = "http://127.0.0.1:5176/";
const port = 9236;
const userDataDir = new URL("../.chrome-smoke-car", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const screenshotPath = new URL("../apex-drive-smoke.png", import.meta.url);

await rm(userDataDir, { recursive: true, force: true });
await mkdir(userDataDir, { recursive: true });

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-extensions",
  "--disable-background-networking",
  "--window-size=1280,720",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  "about:blank",
], { stdio: "ignore" });

async function json(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

for (let i = 0; i < 50; i += 1) {
  try {
    await json(`http://127.0.0.1:${port}/json/version`);
    break;
  } catch {
    await delay(100);
  }
}

const pages = await json(`http://127.0.0.1:${port}/json/list`);
const page = pages.find((entry) => entry.type === "page");
if (!page?.webSocketDebuggerUrl) throw new Error("No debuggable Chrome page found.");

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let id = 0;
const pending = new Map();
const logs = [];

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
    return;
  }
  if (msg.method === "Runtime.consoleAPICalled") {
    logs.push(`${msg.params.type}: ${msg.params.args.map((arg) => arg.value ?? arg.description).join(" ")}`);
  }
  if (msg.method === "Runtime.exceptionThrown") {
    logs.push(`exception: ${msg.params.exceptionDetails.text}`);
  }
  if (msg.method === "Log.entryAdded") {
    logs.push(`${msg.params.entry.level}: ${msg.params.entry.text}`);
  }
});

function send(method, params = {}) {
  id += 1;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");
await send("Page.navigate", { url: targetUrl });
await delay(1800);

const sample = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => ({
    title: document.title,
    fps: document.querySelector("#fps")?.textContent,
    quality: document.querySelector("#quality")?.textContent,
    speed: document.querySelector("#speed")?.textContent,
    lap: document.querySelector("#lap")?.textContent,
    canvas: (() => {
      const c = document.querySelector("canvas");
      return c ? { width: c.width, height: c.height } : null;
    })()
  }))()`,
});

const shot = await send("Page.captureScreenshot", { format: "png" });
await writeFile(screenshotPath, Buffer.from(shot.data, "base64"));

ws.close();
chrome.kill();

console.log(JSON.stringify({
  sample: sample.result.value,
  logs: logs.filter((line) => !line.includes("[vite]")),
  screenshot: screenshotPath.pathname.replace(/^\/([A-Za-z]:)/, "$1"),
}, null, 2));
