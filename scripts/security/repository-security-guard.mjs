#!/usr/bin/env node

/**
 * A deliberately small, dependency-free guard for repository-level execution
 * paths that should never be introduced by an application feature.
 *
 * It scans the checked-out tree only; it never imports project code, installs
 * dependencies, or executes files it inspects.
 */
import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? process.cwd());
const findings = [];

// Adding a root JavaScript file must be an intentional, separately reviewed
// tooling decision. The application currently needs none.
const ALLOWED_ROOT_JAVASCRIPT_FILES = new Set();

const ALLOWED_FONT_EXTENSIONS = new Set([
  '.eot',
  '.license',
  '.md',
  '.otf',
  '.svg',
  '.ttf',
  '.txt',
  '.woff',
  '.woff2',
]);

const EXECUTABLE_TEXT = /\b(?:child_process|execSync|spawnSync|spawn|eval|Function|require|module\.exports|process\.|global(?:This)?\s*\[|Buffer\.from|import\s*\(|import\s+|export\s+|function\s*\w*\s*\(|=>)\b/;

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function addFinding(file, message) {
  findings.push(`${relative(file)}: ${message}`);
}

async function pathExists(file) {
  try {
    await lstat(file);
    return true;
  } catch (error) {
    if (error && error.code === 'ENOENT') return false;
    throw error;
  }
}

function isLikelyText(buffer) {
  if (buffer.includes(0)) return false;
  const text = buffer.toString('utf8');
  const controlCharacters = [...text].filter((character) => {
    const code = character.charCodeAt(0);
    return code < 9 || (code > 13 && code < 32);
  }).length;
  return controlCharacters / Math.max(text.length, 1) < 0.01;
}

async function scanTasksFile() {
  const file = path.join(root, '.vscode', 'tasks.json');
  if (!(await pathExists(file))) return;

  const stats = await lstat(file);
  if (stats.isSymbolicLink()) {
    addFinding(file, 'symbolic links are not allowed for workspace tasks.');
    return;
  }

  // VS Code accepts JSON with comments/trailing commas, so static detection is
  // safer here than using JSON.parse and accidentally skipping malformed JSONC.
  const contents = await readFile(file, 'utf8');
  if (/['"]runOn['"]\s*:\s*['"]folderOpen['"]/i.test(contents)) {
    addFinding(file, 'automatic task execution via runOn: folderOpen is forbidden.');
  }
}

async function walkFonts(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walkFonts(file);
      continue;
    }

    const stats = await lstat(file);
    if (stats.isSymbolicLink()) {
      addFinding(file, 'symbolic links are not allowed under public/fonts.');
      continue;
    }
    if (!stats.isFile()) continue;

    const extension = path.extname(entry.name).toLowerCase();
    if (!ALLOWED_FONT_EXTENSIONS.has(extension)) {
      addFinding(file, `unexpected public/fonts extension ${extension || '(none)'}.`);
      continue;
    }

    const contents = await readFile(file);
    if (isLikelyText(contents) && EXECUTABLE_TEXT.test(contents.toString('utf8'))) {
      addFinding(file, 'executable JavaScript-like content is not allowed under public/fonts.');
    }
  }
}

async function scanFonts() {
  const directory = path.join(root, 'public', 'fonts');
  if (!(await pathExists(directory))) return;
  const stats = await lstat(directory);
  if (stats.isSymbolicLink()) {
    addFinding(directory, 'symbolic links are not allowed for public/fonts.');
    return;
  }
  if (stats.isDirectory()) await walkFonts(directory);
}

async function scanRootJavascript() {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !/\.js$/i.test(entry.name)) continue;
    if (!ALLOWED_ROOT_JAVASCRIPT_FILES.has(entry.name)) {
      addFinding(path.join(root, entry.name), 'unexpected root-level .js file.');
    }
  }
}

await scanTasksFile();
await scanFonts();
await scanRootJavascript();

if (findings.length > 0) {
  console.error('Repository security guard failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  console.error('\nDo not disguise executable code as assets or add automatic editor tasks.');
  process.exitCode = 1;
} else {
  console.log('Repository security guard passed.');
}
