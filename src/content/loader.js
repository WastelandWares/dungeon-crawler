// ============================================================
//  CONTENT LOADER — Markdown + YAML frontmatter parser
//  No external libraries required.
// ============================================================

/**
 * Parse a markdown file with YAML frontmatter delimited by ---.
 * Returns { meta: {}, body: '' }.
 */
export function parseFrontmatter(text) {
  const meta = {};
  let body = text;

  const trimmed = text.replace(/^\uFEFF/, '').trim();

  if (!trimmed.startsWith('---')) {
    return { meta, body: trimmed };
  }

  const endIndex = trimmed.indexOf('---', 3);
  if (endIndex === -1) {
    return { meta, body: trimmed };
  }

  const frontmatterBlock = trimmed.slice(3, endIndex).trim();
  body = trimmed.slice(endIndex + 3).trim();

  const lines = frontmatterBlock.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const rawValue = line.slice(colonIndex + 1).trim();

    meta[key] = parseValue(rawValue);
  }

  return { meta, body };
}

/**
 * Parse a single YAML-ish value into its JS type.
 */
function parseValue(raw) {
  if (raw === '') return '';

  // Boolean
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  // Array: [a, b, c]
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map(s => parseValue(s.trim()));
  }

  // Number
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    return Number(raw);
  }

  // Strip surrounding quotes if present
  if ((raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }

  return raw;
}

/**
 * Fetch and parse a single markdown content file.
 */
export async function loadContentFile(path) {
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`Failed to load content: ${path} (${resp.status})`);
  const text = await resp.text();
  return parseFrontmatter(text);
}

/**
 * Load the manifest.json that lists all content files.
 */
export async function loadManifest(basePath) {
  const resp = await fetch(`${basePath}/manifest.json`);
  if (!resp.ok) throw new Error(`Failed to load manifest: ${resp.status}`);
  return resp.json();
}

/**
 * Load all content files listed in the manifest.
 */
export async function loadAllContent(basePath = 'content') {
  const manifest = await loadManifest(basePath);
  const results = { monsters: [], items: [], quests: [] };

  for (const category of ['monsters', 'items', 'quests']) {
    if (!manifest[category]) continue;
    for (const file of manifest[category]) {
      const content = await loadContentFile(`${basePath}/${category}/${file}`);
      // Only set category from folder name if item doesn't define its own
      if (!content.meta.category) {
        content.meta.category = category;
      }
      results[category].push(content);
    }
  }
  return results;
}
