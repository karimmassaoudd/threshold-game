import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../server-upload", import.meta.url)));
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4174);

const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
]);

function resolveRequestPath(url) {
  const pathname = decodeURIComponent(new URL(url, `http://${host}:${port}`).pathname);
  const requested = normalize(pathname).replace(/^([/\\])+/, "");
  const candidate = resolve(root, requested || "index.html");

  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    return null;
  }

  return candidate;
}

async function sendFile(res, filePath) {
  const fileStat = await stat(filePath);

  if (fileStat.isDirectory()) {
    return sendFile(res, join(filePath, "index.html"));
  }

  res.writeHead(200, {
    "Content-Type": types.get(extname(filePath)) || "application/octet-stream",
    "Content-Length": fileStat.size,
  });
  createReadStream(filePath).pipe(res);
}

createServer(async (req, res) => {
  try {
    const candidate = resolveRequestPath(req.url || "/");

    if (!candidate) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    if (existsSync(candidate)) {
      await sendFile(res, candidate);
      return;
    }

    await sendFile(res, join(root, "index.html"));
  } catch (error) {
    res.writeHead(500).end(error instanceof Error ? error.message : "Server error");
  }
}).listen(port, host, () => {
  console.log(`Apex Drive is running at http://${host}:${port}`);
  console.log(`Serving bundled files from ${root}`);
});
