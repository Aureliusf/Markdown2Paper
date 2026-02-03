import jspdf from "jspdf";
import "jspdf-autotable";
import { latexRenderer } from "../latex-renderer";
import { BaseFormatter, PageConfig, ImageResolver } from "./base-formatter";
import { PaperExportSettings } from "../../types";
import { defaultLayout, LayoutManager } from "../layout-manager";

interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;  // For inline code spans
  latex?: {
    isDisplay: boolean;
  };
}

export class APAFormatter extends BaseFormatter {
  private layout: LayoutManager;
  private pageMargins: { top: number; right: number; bottom: number; left: number };

  constructor(
    doc: jspdf,
    y: number,
    settings: PaperExportSettings,
    imageResolver?: ImageResolver
  ) {
    super(doc, y, settings, imageResolver);
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

  async formatParagraph(node: any): Promise<void> {
  if (
    node.children &&
    node.children.length === 1 &&
    node.children[0].type === "image"
  ) {
    await this.formatImage(node.children[0]);
    return;
  }
  // APA: 0.5" first-line indent, subsequent lines flush left
  const firstLineX = this.pageMargins.left + this.layout.firstLineIndent;
  const subsequentLineX = this.pageMargins.left;
  
  await this.renderTextFlowWithIndent(node.children, firstLineX, subsequentLineX);
}

  async formatList(node: any): Promise<void> {
    this.y += this.layout.paragraphSpacing;
    const listIndentX = this.pageMargins.left + this.layout.listIndent;
    
    for (let index = 0; index < node.children.length; index++) {
      const listItem = node.children[index];
      const prefix = node.ordered ? `${index + 1}. ` : "- ";
      // APA lists: consistent indent without first-line indentation
      await this.renderTextFlowWithIndent(
        listItem.children,
        listIndentX,  // First line starts at list indent
        listIndentX,  // Subsequent lines also at list indent (no hanging indent)
        prefix
      );
      this.y += this.layout.paragraphSpacing / 2;
    }
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

  async formatImage(node: any): Promise<void> {
    await this.renderImage(node, {
      paragraphSpacing: this.layout.paragraphSpacing,
      align: "center",
    });
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

  async formatBlockquote(node: any): Promise<void> {
    this.y += this.layout.paragraphSpacing;
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(
      this.pageMargins.left - 5,
      this.y,
      this.pageMargins.left - 5,
      this.y + 10
    );
    await this.renderTextFlow(
      node.children,
      this.pageMargins.left + this.layout.blockquoteIndent
    );
    this.y += this.layout.paragraphSpacing;
  }

  async renderTextFlowWithIndent(
  nodes: any[], 
  firstLineX: number, 
  subsequentLineX: number,
  prefix = ""
): Promise<void> {
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
  let currentLineHeight = lineHeightPt;
  
  const newLine = () => {
    this.y += currentLineHeight;
    isFirstLine = false;
    currentX = subsequentLineX;
    currentLineHeight = lineHeightPt;
    
    if (this.y + lineHeightPt > pageDimensions.height - margins.bottom) {
      this.doc.addPage();
      this.y = margins.top;
    }
  };
  
  for (const segment of segments) {
    if (segment.latex) {
      const latexResult = segment.latex.isDisplay
        ? await latexRenderer.renderDisplay(segment.text)
        : await latexRenderer.renderInline(segment.text);

      if (latexResult && latexResult.svg) {
        const targetWidth = latexResult.width;
        const targetHeight = latexResult.height;

        if (currentX + targetWidth > maxWidth && currentX > (isFirstLine ? firstLineX : subsequentLineX)) {
          newLine();
        }

        try {
          await this.renderSvg(
            latexResult.svg,
            currentX,
            this.y - targetHeight + fontSize,
            targetWidth,
            targetHeight
          );
          currentX += targetWidth;
          if (targetHeight > currentLineHeight) {
            currentLineHeight = targetHeight;
          }
        } catch (error) {
          console.error("Error rendering inline LaTeX:", error);
          this.doc.setFont(fontName, "normal");
          this.doc.setFontSize(fontSize);
          const fallbackText = `[Math: ${segment.text}]`;
          this.doc.text(fallbackText, currentX, this.y);
          currentX += this.doc.getTextWidth(fallbackText);
        }
        continue;
      }

      this.doc.setFont(fontName, "normal");
      this.doc.setFontSize(fontSize);
      const fallbackText = `[Math: ${segment.text}]`;
      this.doc.text(fallbackText, currentX, this.y);
      currentX += this.doc.getTextWidth(fallbackText);
      continue;
    }

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
  
  this.y += currentLineHeight;
}

// Keep original signature for backward compatibility with lists, etc.
async renderTextFlow(nodes: any[], x: number, prefix = ""): Promise<void> {
  await this.renderTextFlowWithIndent(nodes, x, x, prefix);
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
      } else if (node.type === "inlineMath") {
        segments.push({
          text: node.value,
          bold: false,
          italic: false,
          code: false,
          latex: { isDisplay: false },
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

  async formatDisplayMath(node: any): Promise<void> {
    this.y += this.layout.paragraphSpacing;
    const result = await latexRenderer.renderDisplay(node.value);
    if (result && result.svg) {
      try {
        const x =
          (this.getPageSetup().pageDimensions.width - result.width) /
          2;
        await this.renderSvg(result.svg, x, this.y, result.width, result.height);
        this.y += result.height;
      } catch (error) {
        console.error("Error rendering display LaTeX:", error);
        // Fallback: render as text
        this.doc.text(`[Display Math: ${node.value}]`, this.pageMargins.left, this.y);
        this.y += this.layout.paragraphSpacing;
      }
    } else {
      // Fallback: render as text
      this.doc.text(`[Display Math: ${node.value}]`, this.pageMargins.left, this.y);
      this.y += this.layout.paragraphSpacing;
    }
    this.y += this.layout.paragraphSpacing;
  }

  async formatLatex(node: any, isDisplay: boolean): Promise<void> {
    if (isDisplay) {
      // Display math ($$...$$)
      await this.formatDisplayMath(node);
    } else {
      // Inline math - this will be handled by renderTextFlowWithIndent
      // when processing text segments
      console.warn("Inline LaTeX should be processed in text flow, not as separate node");
    }
  }

  private async renderSvg(
    svgEl: SVGElement,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    const docAny = this.doc as any;
    if (typeof docAny.svg === "function") {
      await docAny.svg(svgEl, { x, y, width, height });
      return;
    }

    // Fallback: rasterize SVG into PNG and add as image
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load SVG image"));
      img.src = url;
    });

    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(width * scale));
    canvas.height = Math.max(1, Math.ceil(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      throw new Error("Canvas context not available");
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    const dataUrl = canvas.toDataURL("image/png");
    docAny.addImage(dataUrl, "PNG", x, y, width, height);
  }
}
