import { existsSync } from "node:fs";

if (!existsSync("AGENTS.md")) {
  console.error("AGENTS.md is required at the repository root.");
  process.exit(1);
}

console.log("AGENTS.md coverage ok.");
