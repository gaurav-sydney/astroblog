// Gate "hygiene": this repo is public. No tracked file may hold a key, a token, a hosting account id or a personal
// email. Example addresses (example.com) and the site's own contact address are allowed.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { ROOT } from "../lib/config.mjs";

const PATTERNS = [
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["Anthropic or OpenAI-style key", /\bsk-(ant-)?[A-Za-z0-9_-]{20,}/],
  ["GitHub token", /\b(ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}/],
  ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["Brevo API key", /\bxkeysib-[a-f0-9]{20,}/],
  ["Bearer value", /Bearer\s+[A-Za-z0-9._-]{24,}/],
  ["Hostinger account id", /\bu\d{9}\b/],
];
const ALLOWED_EMAIL = /@(example\.(com|org|net)|automationworker\.io)$|^you@company\.com$/i; // examples, the site, the form placeholder
const SKIP = /^(package-lock\.json|dist\/runtime\/|public\/runtime\/)/; // upstream runtime and the lockfile

test("no tracked file holds a secret, a hosting account id or a personal email", () => {
  const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: ROOT })
    .toString().split("\0").filter((f) => f && !SKIP.test(f) && !/\.(png|jpg|ico|woff2?)$/.test(f));
  const found = [];
  for (const file of files) {
    let text;
    try { text = readFileSync(join(ROOT, file), "utf8"); } catch { continue; }
    for (const [what, re] of PATTERNS) if (re.test(text)) found.push(`${file}: ${what}`);
    for (const email of text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []) {
      if (!ALLOWED_EMAIL.test(email) && !/^(git@github\.com|[\w.-]+@\d)/.test(email) && !email.includes("@types"))
        found.push(`${file}: email ${email.replace(/^(.).*@/, "$1…@")}`);
    }
  }
  assert.deepEqual(found, [], `remove these before pushing:\n${found.join("\n")}`);
});

test("the deploy target file stays untracked", () => {
  const tracked = execFileSync("git", ["ls-files", ".hostinger"], { cwd: ROOT }).toString().trim();
  assert.equal(tracked, "", ".hostinger/ names the hosting account and must not be committed");
});
