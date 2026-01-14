import jspdf from "jspdf";
import "jspdf-autotable";
import { BaseFormatter, PageConfig } from "./base-formatter";
import { PaperExportSettings } from "../../types";
import { defaultLayout, LayoutManager } from "../layout-manager";

interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;  // For inline code spans
}

export class APAFormatter extends BaseFormatter {
  private layout: LayoutManager;
  private pageMargins: { top: number; right: number; bottom: number; left: number };

  constructor(doc: jspdf, y: number, settings: PaperExportSettings) {
    super(doc, y, settings);
    this.layout = defaultLayout;
    this.pageMargins = this.getPageSetup().margins;
  }

  formatTitle(title: string): void {
    const { fontSize } = this.getPageSetup();
    this.doc.setFontSize(fontSize);
    this.doc.text(title, this.doc.internal.pageSize.width / 2, this.y, {
      align: "center",
    });
    this.y += this.layout.paragraphSpacing;
  }

  formatHeading(node: any): void {
    const { fontSize } = this.getPageSetup();
    this.doc.setFontSize(fontSize + 6 - node.depth * 2);
    this.doc.setFont("Times", "bold");
    this.y += this.layout.headingSpacing.before;
    const text = this.getTextFromChildren(node.children);
    this.doc.text(text, this.pageMargins.left, this.y);
    this.doc.setFont("Times", "normal");
    this.y += this.layout.headingSpacing.after;
  }

  formatParagraph(node: any): void {
    this.y += this.layout.paragraphSpacing;
    this.renderTextFlow(node.children, this.pageMargins.left);
    this.y += this.layout.paragraphSpacing;
  }

  formatList(node: any): void {
    this.y += this.layout.paragraphSpacing;
    node.children.forEach((listItem: any, index: number) => {
      const prefix = node.ordered ? `${index + 1}. ` : "- ";
      this.renderTextFlow(
        listItem.children,
        this.pageMargins.left + this.layout.listIndent,
        prefix
      );
      this.y += this.layout.paragraphSpacing / 2;
    });
    this.y += this.layout.paragraphSpacing / 2;
  }

  formatTable(node: any): void {
    const head = node.children[0].children.map((cell: any) =>
      this.getTextFromChildren(cell.children)
    );
    const body = node.children.slice(1).map((row: any) =>
      row.children.map((cell: any) => this.getTextFromChildren(cell.children))
    );

    (this.doc as any).autoTable({
      startY: this.y,
      head: [head],
      body,
    });

    this.y = (this.doc as any).autoTable.previous.finalY + 10;
  }

  formatImage(node: any): void {
    this.y += this.layout.paragraphSpacing;
    this.doc.text(`[Image: ${node.alt}]`, this.pageMargins.left, this.y);
    this.y += this.layout.paragraphSpacing;
  }

  formatCode(node: any): void {
    const { fontSize } = this.getPageSetup();
    this.y += this.layout.paragraphSpacing;
    this.doc.setFont("Courier", "normal");
    this.doc.setFontSize(fontSize - 2);
    this.doc.text(node.value, this.pageMargins.left, this.y);
    this.doc.setFont("Times", "normal");
    this.doc.setFontSize(fontSize);
    this.y += this.layout.paragraphSpacing;
  }

  formatBlockquote(node: any): void {
    this.y += this.layout.paragraphSpacing;
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(
      this.pageMargins.left - 5,
      this.y,
      this.pageMargins.left - 5,
      this.y + 10
    );
    this.renderTextFlow(
      node.children,
      this.pageMargins.left + this.layout.blockquoteIndent
    );
    this.y += this.layout.paragraphSpacing;
  }

  renderTextFlow(nodes: any[], x: number, prefix = ""): void {
    const { fontSize, lineHeight, margins, pageDimensions } = this.getPageSetup();
    const maxWidth = pageDimensions.width - margins.left - margins.right;
    const lineHeightPt = fontSize * lineHeight;
    const fontName = this.settings.font;
    
    // Extract formatted segments from AST nodes
    const segments = this.extractTextSegments(nodes);
    
    // Prepend prefix if provided (e.g., list bullet "- " or "1. ")
    if (prefix) {
      segments.unshift({ text: prefix, bold: false, italic: false, code: false });
    }
    
    let currentX = x;
    let lineStartX = x;
    let currentLineWidth = 0;
    
    // Helper to move to next line
    const newLine = () => {
      this.y += lineHeightPt;
      currentX = lineStartX;
      currentLineWidth = 0;
      
      // Check for page break
      if (this.y + lineHeightPt > pageDimensions.height - margins.bottom) {
        this.doc.addPage();
        this.y = margins.top;
      }
    };
    
    for (const segment of segments) {
      // Set font for this segment
      if (segment.code) {
        this.doc.setFont("Courier", "normal");
      } else {
        const style = this.getFontStyle(segment.bold, segment.italic);
        this.doc.setFont(fontName, style);
      }
      this.doc.setFontSize(fontSize);
      
      // Split into words while preserving whitespace
      const tokens = segment.text.split(/(\s+)/);
      
      for (const token of tokens) {
        if (token === "") continue;
        
        const tokenWidth = this.doc.getTextWidth(token);
        
        // Check if we need to wrap to next line
        // Don't wrap if we're at line start (handles very long words)
        if (currentLineWidth > 0 && currentLineWidth + tokenWidth > maxWidth) {
          newLine();
          
          // Re-apply font after potential page break
          if (segment.code) {
            this.doc.setFont("Courier", "normal");
          } else {
            const style = this.getFontStyle(segment.bold, segment.italic);
            this.doc.setFont(fontName, style);
          }
          this.doc.setFontSize(fontSize);
          
          // Skip leading whitespace on new line
          if (token.trim() === "") continue;
        }
        
        // Render the token
        this.doc.text(token, currentX, this.y);
        currentX += tokenWidth;
        currentLineWidth += tokenWidth;
      }
    }
    
    // Move to next line after completing the text flow
    this.y += lineHeightPt;
  }

  getTextFromNode(node: any): string {
    if (node.type === "text") {
      return node.value;
    }
    if (node.children) {
      return this.getTextFromChildren(node.children);
    }
    return "";
  }

  getTextFromChildren(children: any[]): string {
    return children.map((child) => this.getTextFromNode(child)).join("");
  }

  formatCitation(citation: string): void {
    this.y += this.layout.paragraphSpacing;
    this.doc.text(`(CITATION: ${citation})`, this.pageMargins.left, this.y);
    this.y += this.layout.paragraphSpacing;
  }

  formatReferenceList(references: string[]): void {
    this.y += this.layout.paragraphSpacing * 2;
    this.doc.text("References", this.pageMargins.left, this.y);
    this.y += this.layout.paragraphSpacing;
    references.forEach((ref) => {
      this.y += this.layout.paragraphSpacing;
      this.doc.text(ref, this.pageMargins.left, this.y);
    });
    this.y += this.layout.paragraphSpacing;
  }

  /**
   * Recursively extracts text segments with formatting information.
   * Handles nested formatting like **bold with *italic* inside**
   */
  private extractTextSegments(
    nodes: any[], 
    inheritBold = false, 
    inheritItalic = false
  ): TextSegment[] {
    const segments: TextSegment[] = [];
    
    for (const node of nodes) {
      if (node.type === "text") {
        segments.push({ 
          text: node.value, 
          bold: inheritBold, 
          italic: inheritItalic,
          code: false 
        });
      } else if (node.type === "strong") {
        // Bold - pass down bold=true, preserve italic state
        const childSegments = this.extractTextSegments(
          node.children, 
          true,           // This node is bold
          inheritItalic   // Preserve parent's italic state
        );
        segments.push(...childSegments);
      } else if (node.type === "emphasis") {
        // Italic - pass down italic=true, preserve bold state
        const childSegments = this.extractTextSegments(
          node.children, 
          inheritBold,    // Preserve parent's bold state
          true            // This node is italic
        );
        segments.push(...childSegments);
      } else if (node.type === "inlineCode") {
        // Inline code - render with Courier font
        segments.push({ 
          text: node.value, 
          bold: false, 
          italic: false,
          code: true 
        });
      } else if (node.children) {
        // Recursively process other node types
        segments.push(...this.extractTextSegments(
          node.children, 
          inheritBold, 
          inheritItalic
        ));
      }
    }
    
    return segments;
  }

  /**
   * Gets the jsPDF font style string based on formatting flags
   */
  private getFontStyle(bold: boolean, italic: boolean): string {
    if (bold && italic) return "bolditalic";
    if (bold) return "bold";
    if (italic) return "italic";
    return "normal";
  }

  getPageSetup(): PageConfig {
    const { margins } = this.settings;
    return {
      margins: {
        top: margins.top * 72,
        right: margins.right * 72,
        bottom: margins.bottom * 72,
        left: margins.left * 72,
      },
      fontSize: 12,
      lineHeight: 2.0,  // APA requires double spacing
      fontFamily: this.settings.font,
      pageDimensions: {
        width: this.doc.internal.pageSize.width,
        height: this.doc.internal.pageSize.height,
      },
    };
  }
}
