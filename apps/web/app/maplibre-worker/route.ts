import { readFile } from "node:fs/promises";
import path from "node:path";

// MapLibre builds its worker URL with a dynamic `new URL()`. Turbopack
// rewrites that to the main bundle, so the map never starts. This route
// serves the real worker, and GroupsMap points MapLibre at it.
export async function GET() {
  const filePath = path.join(
    process.cwd(),
    "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
  );
  const body = await readFile(filePath);

  return new Response(body, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
