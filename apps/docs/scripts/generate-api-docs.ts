import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";

const API_DIR = join(import.meta.dirname, "../content/docs/api-reference");
const PT_BR_RE = /\[pt-BR]\s*/;

// Step 1: Run TypeDoc
console.log("Running TypeDoc...");
execSync("npx typedoc", {
  cwd: join(import.meta.dirname, ".."),
  stdio: "inherit",
});

// Step 2: Build a lookup of English→Portuguese descriptions from all files
// We scan every generated file for "[pt-BR]" lines and build a map
const descriptionMap = new Map<string, string>();

function buildDescriptionMap(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      buildDescriptionMap(fullPath);
      continue;
    }
    if (!entry.name.endsWith(".md")) continue;

    const lines = readFileSync(fullPath, "utf-8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (PT_BR_RE.test(lines[i]) && !lines[i].includes("|")) {
        const ptText = lines[i].replace(PT_BR_RE, "").trim();
        // Collect ALL preceding English description lines (multi-line descriptions)
        const enLines: string[] = [];
        for (let j = i - 1; j >= 0; j--) {
          const t = lines[j].trim();
          if (!t) {
            if (enLines.length > 0) break; // empty line after description = stop
            continue; // skip empty lines before description
          }
          if (t.startsWith("#") || t.startsWith("```") || t.startsWith("Defined in") || t.startsWith("|")) break;
          enLines.unshift(t);
        }
        // Map each line and the full combined text
        for (const en of enLines) {
          descriptionMap.set(en, ptText);
        }
        if (enLines.length > 1) {
          descriptionMap.set(enLines.join(" "), ptText);
        }
      }

      // Also handle inline [pt-BR] in table cells: "English text / [pt-BR] Portuguese text"
      if (lines[i].includes("|") && lines[i].includes("[pt-BR]")) {
        const cells = lines[i].split("|");
        for (const cell of cells) {
          const match = cell.match(/(.+?)\s*\/?\s*\[pt-BR]\s*(.*)/);
          if (match) {
            const en = match[1].trim();
            const pt = match[2].trim();
            if (en && pt) descriptionMap.set(en, pt);
          }
        }
      }
    }
  }
}

buildDescriptionMap(API_DIR);
console.log(`Built ${descriptionMap.size} EN→pt-BR description mappings.`);

// Step 3: Post-process files — add title, fix links, create i18n versions
function processDir(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
      continue;
    }
    if (!entry.name.endsWith(".md") || entry.name.includes(".pt-BR.")) continue;

    let content = readFileSync(fullPath, "utf-8");

    // Extract title from first heading
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (!headingMatch) continue;

    let title = headingMatch[1]
      .replace(/^(Class|Interface|Function|Type Alias|Variable|Enumeration):\s*/, "")
      .trim();

    if (entry.name === "index.md" && dir === API_DIR) {
      title = "API Reference";
    }

    // Add title to frontmatter
    if (content.startsWith("---")) {
      content = content.replace(
        /^---\n([\s\S]*?)\n---/,
        `---\n$1\ntitle: "${title}"\n---`,
      );
    } else {
      content = `---\ntitle: "${title}"\n---\n\n${content}`;
    }

    // Remove heading (fumadocs uses frontmatter title)
    content = content.replace(/^#\s+.+$/m, "");

    // Fix internal links
    const relDir = relative(API_DIR, dir);
    content = content.replace(/\]\(([^)]+)\.md\)/g, (_, linkPath) => {
      const resolved = join(relDir, linkPath).replace(/\\/g, "/");
      return `](/docs/api-reference/${resolved})`;
    });

    // --- EN version: strip all [pt-BR] lines and inline markers ---
    const enLines = content.split("\n").filter((line) => !PT_BR_RE.test(line));
    // Also clean inline "[pt-BR]" in table cells for EN
    const enContent = enLines
      .map((line) => {
        if (line.includes("|") && line.includes("[pt-BR]")) {
          return line.replace(/\s*\/?\s*\[pt-BR]\s*[^|]*/g, "");
        }
        return line;
      })
      .join("\n");

    // --- pt-BR version: replace English descriptions with Portuguese ---
    const ptContent = buildPtBR(content);

    writeFileSync(fullPath, enContent);
    writeFileSync(fullPath.replace(/\.md$/, ".pt-BR.md"), ptContent);
  }
}

function buildPtBR(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table row with inline [pt-BR] — keep only Portuguese part
    if (line.includes("|") && PT_BR_RE.test(line)) {
      const cells = line.split("|");
      const swapped = cells.map((cell) => {
        const match = cell.match(/(.+?)\s*\/?\s*\[pt-BR]\s*(.*)/);
        if (match) return ` ${match[2].trim()} `;
        return cell;
      });
      result.push(swapped.join("|"));
      continue;
    }

    // Table row WITHOUT [pt-BR] — try to translate descriptions from map
    if (line.includes("|") && !line.startsWith("|--") && !PT_BR_RE.test(line)) {
      const cells = line.split("|");
      const translated = cells.map((cell) => {
        const trimmed = cell.trim();
        if (!trimmed || trimmed.startsWith("[") || trimmed.startsWith("`")) return cell;
        // Exact match
        if (descriptionMap.has(trimmed)) {
          return ` ${descriptionMap.get(trimmed)} `;
        }
        // Partial match: if the cell starts with a mapped English string
        for (const [en, pt] of descriptionMap) {
          if (trimmed.startsWith(en)) {
            return ` ${pt} `;
          }
        }
        return cell;
      });
      result.push(translated.join("|"));
      continue;
    }

    // Standalone [pt-BR] line — replaces the previous non-empty English line
    if (PT_BR_RE.test(line)) {
      const ptText = line.replace(PT_BR_RE, "");
      // Walk backwards to find the English description line to replace
      for (let j = result.length - 1; j >= 0; j--) {
        const prev = result[j].trim();
        if (prev && !prev.startsWith("#") && !prev.startsWith("```") && !prev.startsWith("Defined in") && !prev.startsWith("|") && !prev.startsWith("---")) {
          result[j] = ptText;
          break;
        }
      }
      continue;
    }

    result.push(line);
  }

  return result.join("\n");
}

processDir(API_DIR);
console.log("Post-processed frontmatter + i18n split.");

// Step 4: Generate meta.json
const CATEGORY_TITLES: Record<string, string> = {
  classes: "Classes",
  interfaces: "Interfaces",
  functions: "Functions",
  "type-aliases": "Type Aliases",
  variables: "Variables",
  enumerations: "Enumerations",
};

const topDirs = readdirSync(API_DIR, { withFileTypes: true });
const topPages: string[] = ["index"];
for (const d of topDirs) {
  if (d.isDirectory() && existsSync(join(API_DIR, d.name))) {
    topPages.push(`---${CATEGORY_TITLES[d.name] || d.name}---`);
    topPages.push(d.name);
  }
}
writeFileSync(
  join(API_DIR, "meta.json"),
  JSON.stringify({ title: "API Reference", pages: topPages }, null, 2),
);

for (const d of topDirs) {
  if (!d.isDirectory()) continue;
  const catDir = join(API_DIR, d.name);
  const files = readdirSync(catDir)
    .filter((f) => f.endsWith(".md") && !f.includes(".pt-BR."))
    .map((f) => f.replace(".md", ""))
    .sort();

  writeFileSync(
    join(catDir, "meta.json"),
    JSON.stringify({ pages: files }, null, 2),
  );
}

console.log("Generated meta.json files.");

const totalEn = readdirSync(API_DIR, { recursive: true }).filter(
  (f) => typeof f === "string" && f.endsWith(".md") && !f.includes(".pt-BR."),
).length;
const totalPt = readdirSync(API_DIR, { recursive: true }).filter(
  (f) => typeof f === "string" && f.includes(".pt-BR.md"),
).length;
console.log(`Done — ${totalEn} EN + ${totalPt} pt-BR pages (${descriptionMap.size} translated descriptions)`);
