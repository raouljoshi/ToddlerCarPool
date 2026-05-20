import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const files = collectSourceFiles("src").filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"));

const violations = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const imports = [...text.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);

  for (const specifier of imports) {
    if (file.startsWith("src/domain/") && specifier.includes("/application")) {
      violations.push(`${file} imports application layer: ${specifier}`);
    }
    if (file.startsWith("src/domain/") && specifier.includes("/adapters")) {
      violations.push(`${file} imports adapter layer: ${specifier}`);
    }
    if (file.startsWith("src/domain/") && specifier.includes("/worker")) {
      violations.push(`${file} imports worker layer: ${specifier}`);
    }
    if (file.startsWith("src/application/") && specifier.includes("/adapters")) {
      violations.push(`${file} imports adapter layer: ${specifier}`);
    }
    if (file.startsWith("src/application/") && specifier.includes("/worker")) {
      violations.push(`${file} imports worker layer: ${specifier}`);
    }
    if (file.startsWith("src/ui/") && specifier.includes("/adapters")) {
      violations.push(`${file} imports adapter layer: ${specifier}`);
    }
    if (file.startsWith("src/ui/") && specifier.includes("/worker")) {
      violations.push(`${file} imports worker layer: ${specifier}`);
    }
    if (file.startsWith("src/ui/") && specifier === "cloudflare:workers") {
      violations.push(`${file} imports Cloudflare runtime APIs`);
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log("Architecture boundaries ok.");

function collectSourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) return collectSourceFiles(path);
    return path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : [];
  });
}
