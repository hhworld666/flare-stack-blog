import type { JSONContent } from "@tiptap/react";
import { parsePastedMarkdown } from "./parse-markdown";

export interface MarkdownImportMetadata {
  title?: string;
  summary?: string;
  slug?: string;
  category?: string | null;
  tags?: Array<string>;
  date?: string;
}

export interface MarkdownImportDocument {
  metadata: MarkdownImportMetadata;
  content: Array<JSONContent>;
  localImageCount: number;
}

const FRONT_MATTER =
  /^\uFEFF?---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/;
const FRONT_MATTER_START = /^\uFEFF?---(?:\r?\n|$)/;

function stripInlineComment(value: string) {
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (quote === '"' && character === "\\") {
        index += 1;
        continue;
      }
      if (character === quote) {
        if (quote === "'" && value[index + 1] === "'") {
          index += 1;
          continue;
        }
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
    } else if (
      character === "#" &&
      (index === 0 || /\s/.test(value[index - 1] ?? ""))
    ) {
      return value.slice(0, index).trimEnd();
    }
  }

  return value.trimEnd();
}

function parseScalar(raw: string): string | null {
  const value = stripInlineComment(raw.trim());
  if (!value || value === "null" || value === "~") return null;

  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value.slice(1, -1);
    }
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }

  return value;
}

function splitInlineArray(value: string) {
  const items: Array<string> = [];
  let start = 0;
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (quote === '"' && character === "\\") {
        index += 1;
      } else if (character === quote) {
        if (quote === "'" && value[index + 1] === "'") index += 1;
        else quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'") quote = character;
    else if (character === ",") {
      items.push(value.slice(start, index));
      start = index + 1;
    }
  }
  items.push(value.slice(start));

  return items
    .map(parseScalar)
    .filter((item): item is string => Boolean(item?.trim()))
    .map((item) => item.trim());
}

function setFrontMatterValue(
  metadata: MarkdownImportMetadata,
  key: string,
  raw: string,
) {
  const normalizedKey = key.toLowerCase();

  if (normalizedKey === "tags") {
    const value = stripInlineComment(raw.trim());
    if (value.startsWith("[") && value.endsWith("]")) {
      metadata.tags = splitInlineArray(value.slice(1, -1));
    } else {
      const tag = parseScalar(value);
      metadata.tags = tag ? [tag.trim()] : [];
    }
    return;
  }

  const value = parseScalar(raw);
  switch (normalizedKey) {
    case "title":
      if (value !== null) metadata.title = value;
      break;
    case "description":
    case "summary":
      if (value !== null) metadata.summary = value;
      else if (normalizedKey === "summary") metadata.summary = "";
      break;
    case "slug":
      if (value !== null) metadata.slug = value;
      break;
    case "category":
      metadata.category = value;
      break;
    case "date":
    case "pubdate":
    case "publishedat":
      if (value !== null) metadata.date = value;
      break;
  }
}

function parseFrontMatter(source: string): MarkdownImportMetadata {
  const metadata: MarkdownImportMetadata = {};
  const match = FRONT_MATTER.exec(source);
  if (!match) return metadata;

  let collectingTags = false;
  let multilineKey: string | null = null;
  let multilineStyle: ">" | "|" | null = null;
  let multilineLines: Array<string> = [];

  const flushMultiline = () => {
    if (!multilineKey || !multilineStyle) return;
    const separator = multilineStyle === ">" ? " " : "\n";
    setFrontMatterValue(metadata, multilineKey, multilineLines.join(separator));
    multilineKey = null;
    multilineStyle = null;
    multilineLines = [];
  };

  for (const line of match[1].split(/\r?\n/)) {
    if (multilineStyle) {
      if (!line.trim()) {
        multilineLines.push("");
        continue;
      }
      if (/^\s+/.test(line)) {
        multilineLines.push(line.trim());
        continue;
      }
      flushMultiline();
    }

    if (collectingTags) {
      if (!line.trim() || /^\s*#/.test(line)) continue;
      const tagItem = /^\s+-\s*(.*?)\s*$/.exec(line);
      if (tagItem) {
        const tag = parseScalar(tagItem[1] ?? "");
        if (tag?.trim()) metadata.tags?.push(tag.trim());
        continue;
      }
      collectingTags = false;
    }

    const property = /^([A-Za-z][\w-]*):(?:[ \t]*(.*))?$/.exec(line);
    if (!property) continue;

    const key = property[1] ?? "";
    const raw = property[2] ?? "";
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === "tags" && !raw.trim()) {
      metadata.tags = [];
      collectingTags = true;
      continue;
    }

    const blockStyle = /^([|>])[+-]?$/.exec(raw.trim())?.[1];
    if (
      blockStyle &&
      ["description", "summary", "title"].includes(normalizedKey)
    ) {
      multilineKey = key;
      multilineStyle = blockStyle as ">" | "|";
      continue;
    }

    setFrontMatterValue(metadata, key, raw);
  }

  flushMultiline();
  return metadata;
}

export function parseMarkdownImport(source: string): MarkdownImportDocument {
  const frontMatter = FRONT_MATTER.exec(source);
  if (!frontMatter && FRONT_MATTER_START.test(source)) {
    throw new Error("Invalid Markdown front matter");
  }

  const body = frontMatter ? source.slice(frontMatter[0].length) : source;
  const parsed = parsePastedMarkdown(body);

  return {
    metadata: parseFrontMatter(source),
    content: parsed.content,
    localImageCount: parsed.localImageCount,
  };
}
