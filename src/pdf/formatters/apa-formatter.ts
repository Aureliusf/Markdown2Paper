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
  const { fontSize, lineHeight, pageDimensions } = this.getPageSetup();
  const lineHeightPt = fontSize * lineHeight;
  const fontName = this.settings.font;
  
  // APA Title: Centered, Bold
  // Position: 12pt (one font-size) from top margin
  this.y += fontSize;  // Add 12pt spacing from top margin
  
  this.doc.setFontSize(fontSize);
  this.doc.setFont(fontName, "bold");
  this.doc.text(title, pageDimensions.width / 2, this.y, { align: "center" });
  this.doc.setFont(fontName, "normal");
  
  // Move down one double-spaced line after title
  this.y += lineHeightPt;
}

  formatHeading(node: any): void {
  const { fontSize, lineHeight, margins, pageDimensions } = this.getPageSetup();
  const lineHeightPt = fontSize * lineHeight;
  const text = this.getTextFromChildren(node.children);
  const fontName = this.settings.font;
  
  this.doc.setFontSize(fontSize);
  
  // APA 7th Edition Heading Levels
  // Markdown H1 = Title (removed from content, handled separately)
  // Markdown H2 = APA Level 1: Centered, Bold
  // Markdown H3 = APA Level 2: Flush Left, Bold  
  // Markdown H4 = APA Level 3: Flush Left, Bold Italic
  // Markdown H5 = APA Level 4: Indented, Bold, period
  // Markdown H6 = APA Level 5: Indented, Bold Italic, period
  
  switch (node.depth) {
    case 2: // APA Level 1: Centered, Bold
      this.doc.setFont(fontName, "bold");
      this.doc.text(text, pageDimensions.width / 2, this.y, { align: "center" });
      this.y += lineHeightPt;
      break;
      
    case 3: // APA Level 2: Flush Left, Bold
      this.doc.setFont(fontName, "bold");
      this.doc.text(text, margins.left, this.y);
      this.y += lineHeightPt;
      break;
      
    case 4: // APA Level 3: Flush Left, Bold Italic
      this.doc.setFont(fontName, "bolditalic");
      this.doc.text(text, margins.left, this.y);
      this.y += lineHeightPt;
      break;
      
    case 5: // APA Level 4: Indented, Bold, ends with period
      this.doc.setFont(fontName, "bold");
      const text4 = text.endsWith('.') ? text : text + '.';
      this.doc.text(text4, margins.left + this.layout.firstLineIndent, this.y);
      this.y += lineHeightPt;
      break;
      
    case 6: // APA Level 5: Indented, Bold Italic, ends with period
      this.doc.setFont(fontName, "bolditalic");
      const text5 = text.endsWith('.') ? text : text + '.';
      this.doc.text(text5, margins.left + this.layout.firstLineIndent, this.y);
      this.y += lineHeightPt;
      break;
      
    default:
      this.doc.setFont(fontName, "bold");
      this.doc.text(text, margins.left, this.y);
      this.y += lineHeightPt;
  }
  
  this.doc.setFont(fontName, "normal");
}

  formatParagraph(node: any): void {
  // APA: 0.5" first-line indent, subsequent lines flush left
  const firstLineX = this.pageMargins.left + this.layout.firstLineIndent;
  const subsequentLineX = this.pageMargins.left;
  
  this.renderTextFlowWithIndent(node.children, firstLineX, subsequentLineX);
}

  formatList(node: any): void {
    this.y += this.layout.paragraphSpacing;
    const listIndentX = this.pageMargins.left + this.layout.listIndent;
    
    node.children.forEach((listItem: any, index: number) => {
      const prefix = node.ordered ? `${index + 1}. ` : "- ";
      // APA lists: consistent indent without first-line indentation
      this.renderTextFlowWithIndent(
        listItem.children,
        listIndentX,  // First line starts at list indent
        listIndentX,  // Subsequent lines also at list indent (no hanging indent)
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

  renderTextFlowWithIndent(
  nodes: any[], 
  firstLineX: number, 
  subsequentLineX: number,
  prefix = ""
): void {
  const { fontSize, lineHeight, margins, pageDimensions } = this.getPageSetup();
  const maxWidth = pageDimensions.width - margins.right;
  const lineHeightPt = fontSize * lineHeight;
  const fontName = this.settings.font;
  
  const segments = this.extractTextSegments(nodes);
  
  if (prefix) {
    segments.unshift({ text: prefix, bold: false, italic: false, code: false });
  }
  
  let currentX = firstLineX;
  let isFirstLine = true;
  
  const newLine = () => {
    this.y += lineHeightPt;
    isFirstLine = false;
    currentX = subsequentLineX;
    
    if (this.y + lineHeightPt > pageDimensions.height - margins.bottom) {
      this.doc.addPage();
      this.y = margins.top;
    }
  };
  
  for (const segment of segments) {
    if (segment.code) {
      this.doc.setFont("Courier", "normal");
    } else {
      const style = this.getFontStyle(segment.bold, segment.italic);
      this.doc.setFont(fontName, style);
    }
    this.doc.setFontSize(fontSize);
    
    const tokens = segment.text.split(/(\s+)/);
    
    for (const token of tokens) {
      if (token === "") continue;
      
      const tokenWidth = this.doc.getTextWidth(token);
      
      // Check if we need to wrap
      if (currentX + tokenWidth > maxWidth && currentX > (isFirstLine ? firstLineX : subsequentLineX)) {
        newLine();
        
        if (segment.code) {
          this.doc.setFont("Courier", "normal");
        } else {
          const style = this.getFontStyle(segment.bold, segment.italic);
          this.doc.setFont(fontName, style);
        }
        this.doc.setFontSize(fontSize);
        
        if (token.trim() === "") continue;
      }
      
      this.doc.text(token, currentX, this.y);
      currentX += tokenWidth;
    }
  }
  
  this.y += lineHeightPt;
}

// Keep original signature for backward compatibility with lists, etc.
renderTextFlow(nodes: any[], x: number, prefix = ""): void {
  this.renderTextFlowWithIndent(nodes, x, x, prefix);
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
    // Add extra spacing before References section
    this.y += this.layout.paragraphSpacing * 2;
    
    // References heading
    this.doc.setFont(this.settings.font, "bold");
    this.doc.text("References", this.pageMargins.left, this.y);
    this.doc.setFont(this.settings.font, "normal");
    this.y += this.layout.paragraphSpacing;
    
    // Each reference entry - flush left, no first-line indent (APA requirement)
    const referenceIndentX = this.pageMargins.left;
    const { fontSize, lineHeight, margins, pageDimensions } = this.getPageSetup();
    const maxWidth = pageDimensions.width - margins.right;
    const lineHeightPt = fontSize * lineHeight;
    const fontName = this.settings.font;
    
    references.forEach((ref) => {
      this.y += this.layout.paragraphSpacing;
      
      // Handle reference text with proper wrapping and no first-line indent
      let currentX = referenceIndentX;
      
      // Split reference into words for wrapping
      const words = ref.split(/(\s+)/);
      
      for (const word of words) {
        if (word === "") continue;
        
        const wordWidth = this.doc.getTextWidth(word);
        
        // Check if we need to wrap to new line
        if (currentX + wordWidth > maxWidth) {
          this.y += lineHeightPt;
          currentX = referenceIndentX;  // Flush left, no hanging indent
          
          // Page break check
          if (this.y + lineHeightPt > pageDimensions.height - margins.bottom) {
            this.doc.addPage();
            this.y = margins.top;
          }
        }
        
        // Set font for this word (references are normal text)
        this.doc.setFont(fontName, "normal");
        this.doc.setFontSize(fontSize);
        
        this.doc.text(word, currentX, this.y);
        currentX += wordWidth;
      }
      
      // Move to next paragraph
      this.y += lineHeightPt;
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
