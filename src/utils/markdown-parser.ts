import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
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
const REFERENCE_SECTION_KEYWORDS = ["references", "reference", "citations", "bibliography"];

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
function preprocessMarkdown(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  
  let inCodeBlock = false;
  let inFrontmatter = false;
  
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
    
    // Add paragraph break before each content line (except first)
    if (result.length > 0 && result[result.length - 1]?.trim() !== '') {
      result.push(''); // Blank line = paragraph break
    }
    
    result.push(line);
  }
  
  return result.join('\n');
}

export function parseMarkdown(markdownContent: string): ParsedContent {
  // Pre-process: each line becomes a paragraph, remove empty lines
  const processedContent = preprocessMarkdown(markdownContent);
  
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"]);

  const tree = processor.parse(processedContent);

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

	const referenceHeading = tree.children.findIndex(
		(node) =>
			node.type === "heading" &&
			node.depth === 2 &&
			"children" in node &&
			(node.children as any).length > 0 &&
			(node.children as any)[0].type === "text" &&
			(node.children as any)[0].value.toLowerCase() === "references"
	);

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
