// Build the static site for GitHub Pages.
//
// Next.js with `output: "export"` doesn't support route handlers (the
// app/api directory). They make sense only when running `next dev` locally,
// so during static builds we move them aside, build, then move them back.

import { spawn } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const apiDir = resolve(root, "app/api");
const apiBak = resolve(root, "app/_api.disabled");

function moveOutOfWay() {
  if (existsSync(apiDir) && !existsSync(apiBak)) renameSync(apiDir, apiBak);
}
function restore() {
  if (existsSync(apiBak)) renameSync(apiBak, apiDir);
}

let exitCode = 0;
try {
  moveOutOfWay();
  await new Promise((res, rej) => {
    const child = spawn("next", ["build"], {
      stdio: "inherit",
      env: { ...process.env, STATIC: "1" },
    });
    child.on("exit", (code) => (code === 0 ? res() : rej(new Error(`next build exited ${code}`))));
    child.on("error", rej);
  });
} catch (err) {
  console.error(err.message);
  exitCode = 1;
} finally {
  restore();
}
process.exit(exitCode);
