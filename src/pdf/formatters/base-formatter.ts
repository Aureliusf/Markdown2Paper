import jspdf from "jspdf";
import { latexRenderer } from "../latex-renderer";

export interface ImageInfo {
  dataUrl: string;
  width: number;
  height: number;
}

export type ImageResolver = (node: any) => Promise<ImageInfo | null>;

export interface PageConfig {
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  pageDimensions: {
    width: number;
    height: number;
  };
}

import { PaperExportSettings } from "../../types";

export interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
  latex?: {
    isDisplay: boolean;
  };
}

export interface TableStyleOptions {
  headFillColor?: [number, number, number];
  headTextColor?: [number, number, number];
  bodyTextColor?: [number, number, number];
  cellPadding?: number;
}

export interface ImageBlockOptions {
  paragraphSpacing?: number;
  align?: "left" | "center";
  maxWidth?: number;
  tightenAfter?: boolean;
}

export abstract class BaseFormatter {
  doc: jspdf;
  y: number;
  settings: PaperExportSettings;
  imageResolver?: ImageResolver;

  constructor(
    doc: jspdf,
    y: number,
    settings: PaperExportSettings,
    imageResolver?: ImageResolver
  ) {
    this.doc = doc;
    this.y = y;
    this.settings = settings;
    this.imageResolver = imageResolver;
  }

  setY(y: number) {
    this.y = y;
  }

  abstract formatTitle(title: string): void;
  abstract formatHeading(node: any): void;
  abstract formatParagraph(node: any): Promise<void>;
  abstract formatList(node: any): Promise<void>;
  abstract formatTable(node: any): Promise<void>;
  abstract formatImage(node: any): Promise<void>;
  abstract formatCode(node: any): void;
  abstract formatBlockquote(node: any): Promise<void>;
  abstract formatCitation(citation: string): void;
  abstract formatReferenceList(references: string[]): void;
  abstract getPageSetup(): PageConfig;
  abstract formatLatex(node: any, isDisplay: boolean): Promise<void>;

  protected getTableStyleOptions(): TableStyleOptions {
    return {
      headFillColor: [200, 200, 200],
      headTextColor: [40, 40, 40],
      bodyTextColor: [20, 20, 20],
      cellPadding: 2,
    };
  }

  protected getImageBlockOptions(): ImageBlockOptions {
    return {
      paragraphSpacing: 0,
      align: "center",
      tightenAfter: false,
    };
  }

  protected getTextFromNode(node: any): string {
    if (node.type === "text") {
      return node.value;
    }
    if (node.children) {
      return this.getTextFromChildren(node.children);
    }
    return "";
  }

  protected getTextFromChildren(children: any[]): string {
    return children.map((child) => this.getTextFromNode(child)).join("");
  }

  /**
   * Recursively extracts text segments with formatting information.
   * Handles nested formatting like **bold with *italic* inside**
   */
  protected extractTextSegments(
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
          code: false,
        });
      } else if (node.type === "strong") {
        const childSegments = this.extractTextSegments(
          node.children,
          true,
          inheritItalic
        );
        segments.push(...childSegments);
      } else if (node.type === "emphasis") {
        const childSegments = this.extractTextSegments(
          node.children,
          inheritBold,
          true
        );
        segments.push(...childSegments);
      } else if (node.type === "inlineCode") {
        segments.push({
          text: node.value,
          bold: false,
          italic: false,
          code: true,
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
        segments.push(
          ...this.extractTextSegments(node.children, inheritBold, inheritItalic)
        );
      }
    }

    return segments;
  }

  /**
   * Gets the jsPDF font style string based on formatting flags
   */
  protected getFontStyle(bold: boolean, italic: boolean): string {
    if (bold && italic) return "bolditalic";
    if (bold) return "bold";
    if (italic) return "italic";
    return "normal";
  }

  protected async renderImage(
    node: any,
    options?: {
      paragraphSpacing?: number;
      align?: "left" | "center";
      maxWidth?: number;
    }
  ): Promise<void> {
    const spacing = options?.paragraphSpacing ?? 0;
    this.y += spacing;

    const { pageDimensions, margins } = this.getPageSetup();
    const maxWidth =
      options?.maxWidth ??
      pageDimensions.width - margins.left - margins.right;

    if (!this.imageResolver) {
      this.doc.text(`[Image: ${node.alt || node.url}]`, margins.left, this.y);
      this.y += spacing;
      return;
    }

    const imageInfo = await this.imageResolver(node);
    if (!imageInfo) {
      this.doc.text(`[Image: ${node.alt || node.url}]`, margins.left, this.y);
      this.y += spacing;
      return;
    }

    let widthPt = imageInfo.width * 0.75;
    let heightPt = imageInfo.height * 0.75;
    if (!Number.isFinite(widthPt) || widthPt <= 0) {
      widthPt = maxWidth;
    }
    if (!Number.isFinite(heightPt) || heightPt <= 0) {
      heightPt = widthPt * 0.66;
    }

    const scale = Math.min(1, maxWidth / widthPt);
    const renderWidth = widthPt * scale;
    const renderHeight = heightPt * scale;

    if (this.y + renderHeight > pageDimensions.height - margins.bottom) {
      this.doc.addPage();
      this.y = margins.top;
    }

    const format = imageInfo.dataUrl.startsWith("data:image/png")
      ? "PNG"
      : imageInfo.dataUrl.startsWith("data:image/webp")
        ? "WEBP"
        : imageInfo.dataUrl.startsWith("data:image/gif")
          ? "GIF"
          : "JPEG";

    const align = options?.align ?? "left";
    const x =
      align === "center"
        ? margins.left + (maxWidth - renderWidth) / 2
        : margins.left;

    this.doc.addImage(
      imageInfo.dataUrl,
      format,
      x,
      this.y,
      renderWidth,
      renderHeight
    );

    this.y += renderHeight + spacing;
  }

  protected async renderImageBlock(
    node: any,
    options?: ImageBlockOptions
  ): Promise<void> {
    await this.renderImage(node, options);

    if (options?.tightenAfter) {
      const { fontSize, lineHeight } = this.getPageSetup();
      const lineHeightPt = fontSize * lineHeight;
      this.y -= lineHeightPt / 2;
    }
  }

  protected async renderTableWithInlineLatex(
    node: any,
    options?: TableStyleOptions
  ): Promise<void> {
    const autoTable = (await import("jspdf-autotable")).default;
    const styleOptions = { ...this.getTableStyleOptions(), ...options };

    const head = node.children[0].children.map((cell: any) =>
      this.getTextFromChildren(cell.children)
    );
    const body = node.children.slice(1).map((row: any) =>
      row.children.map((cell: any) => this.getTextFromChildren(cell.children))
    );

    const normalizeLatexMarkers = (value: string) => value.replace(/\$\$/g, "$");
    const splitInlineLatex = (value: string) => {
      const normalized = normalizeLatexMarkers(value);
      const segments: Array<{ type: "text" | "latex"; value: string }> = [];
      const regex = /\$([^$]+)\$/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(normalized)) !== null) {
        if (match.index > lastIndex) {
          segments.push({
            type: "text",
            value: normalized.slice(lastIndex, match.index),
          });
        }
        segments.push({ type: "latex", value: match[1] });
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < normalized.length) {
        segments.push({ type: "text", value: normalized.slice(lastIndex) });
      }
      return segments;
    };

    const latexCache = new Map<string, { svg: SVGElement; width: number; height: number }>();
    const cellRenderMap = new Map<
      string,
      Array<{ type: "text"; value: string } | { type: "latex"; value: string }>
    >();

    const scanCells = async (rows: string[][], section: "head" | "body") => {
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        for (let colIndex = 0; colIndex < rows[rowIndex].length; colIndex++) {
          const cellText = rows[rowIndex][colIndex];
          if (!cellText || !cellText.includes("$")) continue;

          const segments = splitInlineLatex(cellText);
          const hasLatex = segments.some((seg) => seg.type === "latex");
          if (!hasLatex) continue;

          for (const seg of segments) {
            if (seg.type !== "latex") continue;
            if (latexCache.has(seg.value)) continue;
            const result = await latexRenderer.renderInline(seg.value);
            if (result?.svg) {
              latexCache.set(seg.value, result);
            }
          }

          cellRenderMap.set(`${section}:${rowIndex}:${colIndex}`, segments);
          rows[rowIndex][colIndex] = "";
        }
      }
    };

    await scanCells([head], "head");
    await scanCells(body, "body");

    const pendingSvgRenders: Promise<void>[] = [];
    const { pageDimensions, margins } = this.getPageSetup();
    const tableWidth = pageDimensions.width - margins.left - margins.right;
    const padding = styleOptions.cellPadding ?? 2;

    autoTable(this.doc, {
      startY: this.y,
      head: [head],
      body,
      margin: { left: margins.left, right: margins.right },
      tableWidth,
      headStyles: {
        fillColor: styleOptions.headFillColor ?? [200, 200, 200],
        textColor: styleOptions.headTextColor ?? [40, 40, 40],
      },
      styles: {
        textColor: styleOptions.bodyTextColor ?? [20, 20, 20],
        cellWidth: "wrap",
        overflow: "linebreak",
      },
      didDrawCell: (data: any) => {
        const key = `${data.section}:${data.row.index}:${data.column.index}`;
        const segments = cellRenderMap.get(key);
        if (!segments) return;

        const fontSize = data.cell.styles?.fontSize ?? this.doc.getFontSize();
        const lineHeight = (data.cell.styles?.lineHeight ?? 1.2) * fontSize;
        const startX = data.cell.x + padding;
        const maxX = data.cell.x + data.cell.width - padding;
        let currentX = startX;
        let currentY = data.cell.y + padding + fontSize;

        const newLine = () => {
          currentY += lineHeight;
          currentX = startX;
        };

        const renderText = (text: string) => {
          const tokens = text.split(/(\s+)/);
          for (const token of tokens) {
            if (token === "") continue;
            const width = this.doc.getTextWidth(token);
            if (currentX + width > maxX && currentX > startX) {
              newLine();
            }
            if (token.trim() !== "") {
              this.doc.text(token, currentX, currentY);
            }
            currentX += width;
          }
        };

        for (const seg of segments) {
          if (seg.type === "text") {
            renderText(seg.value);
            continue;
          }

          const latex = latexCache.get(seg.value);
          if (!latex) {
            renderText(`$${seg.value}$`);
            continue;
          }

          const availableWidth = maxX - currentX;
          if (latex.width > availableWidth && currentX > startX) {
            newLine();
          }

          const renderWidth = Math.min(latex.width, maxX - currentX);
          const scale = renderWidth / latex.width;
          const renderHeight = latex.height * scale;
          const y = currentY - renderHeight + fontSize;

          pendingSvgRenders.push(
            this.renderSvg(latex.svg, currentX, y, renderWidth, renderHeight).catch(
              (error) => console.error("Error rendering LaTeX in table cell:", error)
            )
          );

          currentX += renderWidth;
        }
      },
    });

    if (pendingSvgRenders.length > 0) {
      await Promise.allSettled(pendingSvgRenders);
    }

    const finalY = (this.doc as any).lastAutoTable?.finalY;
    this.y = (finalY ?? this.y) + 10;
  }

  protected async renderSvg(
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

    const pngData = canvas.toDataURL("image/png");
    this.doc.addImage(pngData, "PNG", x, y, width, height);
    URL.revokeObjectURL(url);
  }
}
