import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const git = (args, options = {}) =>
  execFileSync("git", args, { encoding: "utf8", ...options }).trim();
await fs.access("dist/index.html");
await fs.access("dist/sw.js");
const source = git(["rev-parse", "HEAD"]);
const gitDir = git(["rev-parse", "--absolute-git-dir"]);
const remote = git(["ls-remote", "origin", "refs/heads/gh-pages"]);
let parent = null;
if (remote) {
  git(["fetch", "origin", "refs/heads/gh-pages"]);
  parent = git(["rev-parse", "FETCH_HEAD"]);
}
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "bloodlines-pages-"));
try {
  const env = { ...process.env, GIT_INDEX_FILE: path.join(temporary, "index") };
  const deployGit = (args) =>
    git(
      ["--git-dir=" + gitDir, "--work-tree=" + path.resolve("dist"), ...args],
      { env, cwd: path.resolve("dist") },
    );
  deployGit(["read-tree", "--empty"]);
  deployGit(["add", "--force", "--all"]);
  const tree = deployGit(["write-tree"]);
  const args = [
    "commit-tree",
    tree,
    "-m",
    `Publish BLOODLINES static build from ${source}`,
  ];
  if (parent) args.push("-p", parent);
  const commit = deployGit(args);
  // Ordinary push: concurrent updates are rejected, never force-pushed.
  git(["push", "origin", `${commit}:refs/heads/gh-pages`], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  console.log(
    `Published static files to branch gh-pages (${commit}). This does not enable Pages or prove an HTTPS site is live.`,
  );
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}
