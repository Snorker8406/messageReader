import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "server/dist");

function fixESMImports(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      fixESMImports(filePath);
    } else if (file.endsWith(".js")) {
      let content = fs.readFileSync(filePath, "utf-8");
      const original = content;

      // Fix relative imports without .js extension
      // Matches: from "./xxx" or from './xxx' or from "../xxx" etc
      content = content.replace(
        /from\s+["'](\.[./]*[^."']*?)["']/g,
        (match, importPath) => {
          if (importPath.endsWith(".js")) {
            return match;
          }
          return `from "${importPath}.js"`;
        }
      );

      if (content !== original) {
        fs.writeFileSync(filePath, content, "utf-8");
        console.log(`✓ Fixed: ${filePath}`);
      }
    }
  }
}

console.log("Fixing ES module imports in TypeScript output...");
fixESMImports(distDir);
console.log("✅ ES module imports fixed!");
