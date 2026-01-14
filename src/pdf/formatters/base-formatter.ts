import jspdf from "jspdf";

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

  constructor(doc: jspdf, y: number, settings: PaperExportSettings) {
    this.doc = doc;
    this.y = y;
    this.settings = settings;
  }

  setY(y: number) {
    this.y = y;
  }

  abstract formatTitle(title: string): void;
  abstract formatHeading(node: any): void;
  abstract formatParagraph(node: any): void;
  abstract formatList(node: any): void;
  abstract formatTable(node: any): void;
  abstract formatImage(node: any): void;
  abstract formatCode(node: any): void;
  abstract formatBlockquote(node: any): void;
  abstract formatCitation(citation: string): void;
  abstract formatReferenceList(references: string[]): void;
  abstract getPageSetup(): PageConfig;
}
