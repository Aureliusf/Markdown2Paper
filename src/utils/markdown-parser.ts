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

export function parseMarkdown(markdownContent: string): ParsedContent {
	const processor = unified()
		.use(remarkParse)
		.use(remarkFrontmatter, ["yaml"]);

	const tree = processor.parse(markdownContent);

	let title = "Paper";
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
