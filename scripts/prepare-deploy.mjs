import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const target = resolve(root, "server-upload");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(dist, target, { recursive: true });

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
    "- assets/",
    "- .htaccess",
    "",
    "The CSS and JavaScript are bundled in the assets folder and linked with relative paths.",
    "",
    "Do not upload the project root index.html, src folder, dist folder, or node_modules as the live website.",
    "",
    "To test the same bundled files locally, run:",
    "npm run serve:upload",
    "",
  ].join("\n"),
);

console.log(`Ready for server upload: ${target}`);
