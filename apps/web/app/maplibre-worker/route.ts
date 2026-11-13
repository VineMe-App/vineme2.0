import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const WORKER_REL_PATH = "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs";

function resolveWorkerPath() {
  const localPath = path.join(process.cwd(), WORKER_REL_PATH);
  if (existsSync(localPath)) return localPath;
  return path.resolve(process.cwd(), "../..", WORKER_REL_PATH);
}

// MapLibre builds its worker URL with a dynamic `new URL()`. Turbopack
// rewrites that to the main bundle, so the map never starts. This route
// serves the real worker, and GroupsMap points MapLibre at it.
export async function GET() {
  const body = await readFile(resolveWorkerPath());

  return new Response(body, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
