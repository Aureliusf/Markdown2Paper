import jspdf from "jspdf";
import { PaperExportSettings } from "../types";
import { BaseFormatter } from "./formatters/base-formatter";
import { loadFonts } from "./font-loader";
import { FormatterFactory } from "./formatter-factory";

// Helper to check if a node has actual content
function hasContent(node: any): boolean {
	if (node.type === "paragraph") {
		if (!node.children || node.children.length === 0) return false;

		// Check if all children are empty or whitespace-only text
		const text = node.children
			.filter((child: any) => child.type === "text")
			.map((child: any) => child.value)
			.join("")
			.trim();

		return text.length > 0 || node.children.some(
			(child: any) => child.type !== "text"  // Has non-text children (emphasis, strong, etc.)
		);
	}

	// Other node types (heading, list, table, etc.) are assumed to have content
	return true;
}

export async function generatePdf(
  parsedContent: any,
  settings: PaperExportSettings
): Promise<Blob> {
  const doc = new jspdf({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'  // US Letter: 612 x 792 points (8.5" x 11")
  });
  loadFonts(doc, settings);

  // Use factory to create the appropriate formatter based on settings
  let formatter: BaseFormatter;
  let y: number;

  try {
    // Create formatter dynamically based on selected format style
    formatter = FormatterFactory.createFormatter(doc, 0, settings);
  } catch (error) {
    console.error("Failed to create formatter:", error);
    throw new Error(
      `Failed to create formatter for format style: ${settings.selectedFormatStyle}. ` +
      `Available formats: ${FormatterFactory.getAvailableFormats().join(", ")}`
    );
  }

  const { margins } = formatter.getPageSetup();
  y = margins.top;
  formatter.setY(y);

  if (parsedContent.title && parsedContent.title.trim() !== "") {
    formatter.formatTitle(parsedContent.title);
    y = formatter.y;
  } else {
    console.warn("No title found in markdown document. Skipping title formatting.");
  }

  // Collect top-level nodes only, then process them
  const nodes: any[] = parsedContent.content.children.filter((node: any) => hasContent(node));

  // Process each node with proper async handling
  for (const node of nodes) {
    if (y > doc.internal.pageSize.height - margins.bottom) {
      doc.addPage();
      y = margins.top;
    }
    formatter.setY(y);

    switch (node.type) {
      case "heading":
        // Check for reference section - insert page break
        if (node.data?.isReferenceSection) {
          doc.addPage();
          y = margins.top;
          formatter.setY(y);
        }
        // @ts-ignore
        formatter.formatHeading(node);
        break;
      case "paragraph":
        // @ts-ignore
        await formatter.formatParagraph(node);
        break;
      case "list":
        // @ts-ignore
        await formatter.formatList(node);
        break;
      case "table":
        // @ts-ignore
        formatter.formatTable(node);
        break;
      case "image":
        // @ts-ignore
        formatter.formatImage(node);
        break;
      case "code":
        // @ts-ignore
        formatter.formatCode(node);
        break;
      case "blockquote":
        // @ts-ignore
        await formatter.formatBlockquote(node);
        break;
      case "math":
        // Display math ($$...$$)
        // @ts-ignore
        await formatter.formatLatex(node, true);
        break;
      case "inlineMath":
        // Inline math ($...$) - handled by formatLatex for consistency
        // @ts-ignore
        await formatter.formatLatex(node, false);
        break;
      default:
        console.warn(`Unsupported node type: ${node.type}. Skipping node.`);
        break;
    }
    y = formatter.y;
  }

  if (parsedContent.citations.length > 0) {
    parsedContent.citations.forEach((citation: string) => {
      formatter.formatCitation(citation);
    });
  }

  if (parsedContent.references.length > 0) {
    formatter.formatReferenceList(parsedContent.references);
  }

  return doc.output("blob");
}
