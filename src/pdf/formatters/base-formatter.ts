import jspdf from "jspdf";

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
  abstract formatTable(node: any): void;
  abstract formatImage(node: any): Promise<void>;
  abstract formatCode(node: any): void;
  abstract formatBlockquote(node: any): Promise<void>;
  abstract formatCitation(citation: string): void;
  abstract formatReferenceList(references: string[]): void;
  abstract getPageSetup(): PageConfig;
  abstract formatLatex(node: any, isDisplay: boolean): Promise<void>;

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
}
