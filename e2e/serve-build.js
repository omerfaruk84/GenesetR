/**
 * Minimal static server for the production build (../build, or the folder
 * named by E2E_BUILD_DIR), used by the
 * smoke tests in CI. Unknown paths get index.html, as the real web server
 * does for the single-page application.
 *
 *   node serve-build.js [port]
 */
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.resolve(process.env.E2E_BUILD_DIR || path.join(__dirname, "..", "build"));
const port = Number(process.argv[2] || process.env.PORT || 3002);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".map": "application/json",
};

if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error(`No build found in ${root}. Run "npm run build" in Frontend first.`);
  process.exit(1);
}

http
  .createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let file = path.normalize(path.join(root, pathname));
    // Never serve anything outside the build folder
    if (!file.startsWith(root)) file = path.join(root, "index.html");
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "index.html");
    response.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(file).pipe(response);
  })
  .listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
