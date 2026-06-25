import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const indexPath = path.join(distDir, "index.html");
const proxyTarget = new URL(process.env.BACKEND_URL ?? "http://localhost:4000");
const port = Number(process.env.PORT ?? 3000);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

const pipeProxyRequest = (req, res) => {
  const upstreamPath = `${proxyTarget.pathname.replace(/\/$/, "")}${req.url}`;
  const requester = proxyTarget.protocol === "https:" ? httpsRequest : httpRequest;

  const upstream = requester(
    {
      protocol: proxyTarget.protocol,
      hostname: proxyTarget.hostname,
      port:
        proxyTarget.port || (proxyTarget.protocol === "https:" ? 443 : 80),
      method: req.method,
      path: upstreamPath,
      headers: {
        ...req.headers,
        host: proxyTarget.host,
        "x-forwarded-host": req.headers.host,
        "x-forwarded-proto": "https",
      },
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );

  upstream.on("error", (error) => {
    res.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        code: "API_PROXY_ERROR",
        message: "Unable to reach the SitePulse backend.",
        detail: error instanceof Error ? error.message : String(error),
      }),
    );
  });

  req.pipe(upstream);
};

const resolveStaticPath = (requestPath) => {
  const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
  const safePath = path.normalize(normalizedPath).replace(/^(\.\.[/\\])+/, "");
  return path.join(distDir, safePath);
};

const serveFile = async (filePath, res) => {
  const extension = path.extname(filePath).toLowerCase();
  const contentType =
    contentTypes.get(extension) ?? "application/octet-stream";
  const fileStats = await stat(filePath);

  res.writeHead(200, {
    "content-type": contentType,
    "content-length": fileStats.size,
  });
  createReadStream(filePath).pipe(res);
};

createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }

  if (req.url.startsWith("/api/") || req.url === "/api") {
    pipeProxyRequest(req, res);
    return;
  }

  const requestUrl = new URL(req.url, "http://localhost");
  const filePath = resolveStaticPath(requestUrl.pathname);

  try {
    if (existsSync(filePath) && (await stat(filePath)).isFile()) {
      await serveFile(filePath, res);
      return;
    }

    await serveFile(indexPath, res);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
}).listen(port, "0.0.0.0", () => {
  console.log(
    `SitePulse frontend listening on http://0.0.0.0:${port} and proxying /api to ${proxyTarget.origin}`,
  );
});
