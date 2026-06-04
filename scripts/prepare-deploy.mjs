import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const target = resolve(root, "server-upload");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(dist, target, { recursive: true });

const indexPath = resolve(target, "index.html");
let html = await readFile(indexPath, "utf8");

const cssMatch = html.match(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/i);
if (cssMatch) {
  const cssPath = resolve(target, cssMatch[1].replace(/^\.\//, ""));
  const css = await readFile(cssPath, "utf8");
  html = html.replace(cssMatch[0], `<style>\n${css.replace(/<\/style/gi, "<\\/style")}\n</style>`);
}

const scriptMatch = html.match(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["'][^>]*><\/script>/i);
if (scriptMatch) {
  const scriptPath = resolve(target, scriptMatch[1].replace(/^\.\//, ""));
  const script = await readFile(scriptPath, "utf8");
  html = html.replace(scriptMatch[0], `<script type="module">\n${script.replace(/<\/script/gi, "<\\/script")}\n</script>`);
}

await writeFile(indexPath, html);
await rm(resolve(target, "assets"), { recursive: true, force: true });

await writeFile(
  resolve(target, ".htaccess"),
  [
    "Options -MultiViews",
    "DirectoryIndex index.html",
    "AddType text/css .css",
    "AddType text/javascript .js .mjs",
    "",
    "<IfModule mod_rewrite.c>",
    "  RewriteEngine On",
    "  RewriteCond %{REQUEST_FILENAME} !-f",
    "  RewriteCond %{REQUEST_FILENAME} !-d",
    "  RewriteRule . index.html [L]",
    "</IfModule>",
    "",
  ].join("\n"),
);

await writeFile(
  resolve(target, "UPLOAD_THIS_FOLDER_CONTENTS.txt"),
  [
    "Upload the CONTENTS of this server-upload folder to your website root.",
    "",
    "Your server root should contain:",
    "- index.html",
    "- .htaccess",
    "",
    "This index.html is self-contained: the compiled CSS and JavaScript are already inside it.",
    "",
    "Do not upload the project root index.html, src folder, dist folder, or node_modules as the live website.",
    "",
    "To test the same bundled files locally, run:",
    "npm run serve:upload",
    "",
  ].join("\n"),
);

console.log(`Ready for server upload: ${target}`);
