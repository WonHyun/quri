// Copies the built React bundle (apps/web/dist) into the API's dist/public
// so a single App Service can serve both the API and the static frontend.
// Runs as apps/api postbuild; safe to skip when the web bundle is absent.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const webDist = join(apiRoot, "..", "web", "dist");
const publicDir = join(apiRoot, "dist", "public");

if (!existsSync(webDist)) {
  console.warn(
    `[copy-web] web bundle not found at ${webDist} — skipping static copy. ` +
      `Run "npm run build --workspace=apps/web" first to enable static serving.`,
  );
  process.exit(0);
}

mkdirSync(publicDir, { recursive: true });
cpSync(webDist, publicDir, { recursive: true });
console.log(`[copy-web] copied ${webDist} -> ${publicDir}`);
