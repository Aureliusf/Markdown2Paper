import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkMath from "remark-math";
import { load } from "js-yaml";
import { visit } from "unist-util-visit";
import { Root } from "mdast";

interface ParsedContent {
	title: string;
	content: Root;
	frontmatter: { [key: string]: any };
	citations: string[];
	references: string[];
}

// Pattern to detect standalone Obsidian tags
const OBSIDIAN_TAG_PATTERN = /^(#[a-zA-Z0-9_-]+\s*)+$/;

// Reference section keywords
const REFERENCE_SECTION_KEYWORDS = [
  "references",
  "reference",
  "citations",
  "bibliography",
  "works cited",
  "work cited",
];

// Filter function to remove tag-only paragraphs
function isObsidianTagParagraph(node: any): boolean {
	if (node.type !== "paragraph") return false;
	if (!node.children || node.children.length !== 1) return false;
	if (node.children[0].type !== "text") return false;

	const text = node.children[0].value.trim();
	return OBSIDIAN_TAG_PATTERN.test(text);
}

/**
 * Pre-processes markdown to convert each line to a separate paragraph.
 * - Each non-empty line becomes its own paragraph
 * - Empty lines are removed (no extra spacing)
 * - Preserves code blocks and frontmatter
 */
function preprocessMarkdown(content: string): { content: string; tableBlocks: string[][] } {
  const lines = content.split('\n');
  const result: string[] = [];
  const tableBlocks: string[][] = [];
  
  let inCodeBlock = false;
  let inFrontmatter = false;
  const obsidianEmbedPattern = /!\[\[([^\]]+)\]\]/g;
  const tableDividerPattern = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/;

  const isTableStart = (index: number): boolean => {
    const line = lines[index] || "";
    const next = lines[index + 1] || "";
    if (!line.includes("|")) return false;
    return tableDividerPattern.test(next);
  };

  const expandDisplayMathInLine = (line: string): string[] => {
    const parts: string[] = [];
    let remaining = line;
    while (remaining.includes("$$")) {
      const start = remaining.indexOf("$$");
      const end = remaining.indexOf("$$", start + 2);
      if (end === -1) break;

      const before = remaining.slice(0, start).trim();
      const math = remaining.slice(start, end + 2).trim();
      const after = remaining.slice(end + 2).trim();

      if (before) parts.push(before);
      parts.push(""); // Blank line before display math
      parts.push(math);
      parts.push(""); // Blank line after display math

      remaining = after;
    }

    if (parts.length === 0) return [line];
    if (remaining) parts.push(remaining);
    return parts;
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || '';
    const trimmedLine = line.trim();
    
    // Track frontmatter (only at start of document)
    if (i === 0 && trimmedLine === '---') {
      inFrontmatter = true;
      result.push(line);
      continue;
    }
    
    if (inFrontmatter) {
      result.push(line);
      if (trimmedLine === '---') {
        inFrontmatter = false;
        result.push(''); // Blank line after frontmatter
      }
      continue;
    }
    
    // Track code blocks
    if (trimmedLine.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }
    
    if (inCodeBlock) {
      result.push(line);
      continue;
    }
    
    // Skip empty lines completely (no spacing)
    if (trimmedLine === '') {
      continue;
    }

    // Preserve markdown tables as contiguous blocks (no per-line paragraph breaks)
    if (isTableStart(i)) {
      if (result.length > 0 && result[result.length - 1]?.trim() !== '') {
        result.push('');
      }

      const normalizeLine = (input: string) =>
        input.replace(obsidianEmbedPattern, (_match, inner) => {
          const [target, alt] = inner.split("|").map((part: string) => part.trim());
          const safeAlt = alt || "";
          const encodedTarget = target.replace(/ /g, "%20");
          return `![${safeAlt}](${encodedTarget})`;
        });

      const tableLines: string[] = [];
      tableLines.push(normalizeLine(line));
      tableLines.push(lines[i + 1] || "");

      let j = i + 2;
      for (; j < lines.length; j++) {
        const rowLine = lines[j] || "";
        const trimmedRow = rowLine.trim();
        if (trimmedRow === '') break;
        if (!rowLine.includes("|")) break;
        tableLines.push(normalizeLine(rowLine));
      }

      const placeholder = `[[[TABLE_${tableBlocks.length}]]]`;
      tableBlocks.push(tableLines);
      result.push(placeholder);

      i = j - 1;
      continue;
    }
    
    const normalizedLine = line.replace(obsidianEmbedPattern, (_match, inner) => {
      const [target, alt] = inner.split("|").map((part: string) => part.trim());
      const safeAlt = alt || "";
      const encodedTarget = target.replace(/ /g, "%20");
      return `![${safeAlt}](${encodedTarget})`;
    });

    const expandedLines = expandDisplayMathInLine(normalizedLine);
    for (const expandedLine of expandedLines) {
      if (expandedLine.trim() === '') {
        // Preserve explicit blank lines for display math separation
        if (result.length > 0 && result[result.length - 1]?.trim() !== '') {
          result.push('');
        }
        continue;
      }

      // Add paragraph break before each content line (except first)
      if (result.length > 0 && result[result.length - 1]?.trim() !== '') {
        result.push(''); // Blank line = paragraph break
      }

      result.push(expandedLine);
    }
  }
  
  return { content: result.join('\n'), tableBlocks };
}

export function parseMarkdown(markdownContent: string): ParsedContent {
  // Pre-process: each line becomes a paragraph, remove empty lines
  const processed = preprocessMarkdown(markdownContent);
  const processedContent = processed.content;
  
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkMath);

  const tree = processor.parse(processedContent);

  const toTableNode = (lines: string[]) => {
    const normalizeRow = (row: string): string[] => {
      let trimmed = row.trim();
      if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
      if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
      return trimmed.split("|").map((cell) => cell.trim());
    };

    if (!lines[0]) {
      return { type: "paragraph", children: [] };
    }
    const headerCells = normalizeRow(lines[0]);
    const bodyLines = lines.slice(2);
    const bodyRows = bodyLines.map((row) => normalizeRow(row));
    const columnCount = headerCells.length;

    const normalizeCells = (cells: string[]) => {
      const normalized = cells.slice(0, columnCount);
      while (normalized.length < columnCount) normalized.push("");
      return normalized;
    };

    const makeRow = (cells: string[]) => ({
      type: "tableRow",
      children: normalizeCells(cells).map((cell) => ({
        type: "tableCell",
        children: cell ? [{ type: "text", value: cell }] : [],
      })),
    });

    return {
      type: "table",
      align: new Array(columnCount).fill(null),
      children: [
        makeRow(headerCells),
        ...bodyRows.map((row) => makeRow(row)),
      ],
    };
  };

  const tableTokenPattern = /^\[\[\[TABLE_(\d+)]]]\s*$/;
  tree.children = tree.children.map((node: any) => {
    if (
      node.type === "paragraph" &&
      node.children &&
      node.children.length === 1 &&
      node.children[0].type === "text"
    ) {
      const match = tableTokenPattern.exec(node.children[0].value.trim());
      if (match && match[1] !== undefined) {
        const index = Number.parseInt(match[1], 10);
        const tableLines = processed.tableBlocks[index];
        if (tableLines) {
          return toTableNode(tableLines);
        }
      }
    }
    return node;
  });

	let title = "Untitled";
	let frontmatter: { [key: string]: any } = {};
	let titleFoundInFrontmatter = false;

	const yamlNode = tree.children.find((node) => node.type === "yaml");

	if (yamlNode && "value" in yamlNode) {
		try {
			frontmatter = (load(yamlNode.value) as { [key: string]: any }) || {};
			if (frontmatter.title) {
				title = frontmatter.title;
				titleFoundInFrontmatter = true;
			}
		} catch (e) {
			console.error("Error parsing frontmatter:", e);
		}
	}

	if (!titleFoundInFrontmatter) {
		const firstH1Index = tree.children.findIndex(
			(node) =>
				node.type === "heading" &&
				node.depth === 1 &&
				"children" in node &&
				(node.children as any).length > 0 &&
				(node.children as any)[0].type === "text"
		);

		if (firstH1Index !== -1) {
			const firstH1 = tree.children[firstH1Index] as any;
			title = firstH1.children[0].value;
			// Remove the H1 node from the tree to prevent duplication
			tree.children.splice(firstH1Index, 1);
		}
	}

	// Remove standalone Obsidian tag paragraphs
	tree.children = tree.children.filter(node => !isObsidianTagParagraph(node));

	// Mark reference section headings
	visit(tree, "heading", (node: any) => {
		if (node.children && node.children.length > 0) {
			const text = node.children
				.filter((child: any) => child.type === "text")
				.map((child: any) => child.value)
				.join("")
				.toLowerCase()
				.trim();

			if (REFERENCE_SECTION_KEYWORDS.includes(text)) {
				node.data = node.data || {};
				node.data.isReferenceSection = true;
			}
		}
	});

	const citations: string[] = [];
	const references: string[] = [];

	visit(tree, "text", (node) => {
		const regex = /\[@(.*?)\]/g;
		let match;
		while ((match = regex.exec(node.value)) !== null) {
			if (match[1]) {
				citations.push(match[1]);
			}
		}
	});

	const referenceHeading = tree.children.findIndex((node) => {
		if (node.type !== "heading" || node.depth !== 2 || !("children" in node)) {
			return false;
		}
		const text = (node.children as any[])
			.filter((child: any) => child.type === "text")
			.map((child: any) => child.value)
			.join("")
			.toLowerCase()
			.trim();
		return REFERENCE_SECTION_KEYWORDS.includes(text);
	});

	if (referenceHeading !== -1) {
		const referenceList = tree.children.find(
			(node, index) => index > referenceHeading && node.type === "list"
		);
		if (referenceList && "children" in referenceList) {
			(referenceList.children as any).forEach((listItem: any) => {
				references.push(
					listItem.children
						.map((child: any) =>
							child.children.map((text: any) => text.value).join("")
						)
						.join("")
				);
			});
		}
	}

	return {
		title,
		content: tree,
		frontmatter,
		citations,
		references,
	};
}
