import jspdf from "jspdf";
import { PaperExportSettings, FormatStyle } from "../types";
import { APAFormatter } from "./formatters/apa-formatter";
import { BaseFormatter } from "./formatters/base-formatter";
import { loadFonts } from "./font-loader";
import { visit } from "unist-util-visit";

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

  let formatter: BaseFormatter;
  let y: number;

  switch (settings.selectedFormatStyle) {
    case FormatStyle.APA:
      // Y will be properly initialized after this, so a placeholder is fine.
      formatter = new APAFormatter(doc, 0, settings);
      break;
    default:
      throw new Error(
        `Unsupported format style: ${settings.selectedFormatStyle}`
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

  visit(parsedContent.content, (node) => {
    if (y > doc.internal.pageSize.height - margins.bottom) {
      doc.addPage();
      y = margins.top;
    }
    formatter.setY(y);

    switch (node.type) {
      case "heading":
        // @ts-ignore
        formatter.formatHeading(node);
        break;
      case "paragraph":
        // @ts-ignore
        formatter.formatParagraph(node);
        break;
      case "list":
        // @ts-ignore
        formatter.formatList(node);
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
        formatter.formatBlockquote(node);
        break;
    }
    y = formatter.y;
  });

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
