import jspdf from "jspdf";
import { PaperExportSettings } from "../types";

export function loadFonts(doc: jspdf, settings: PaperExportSettings) {
  // Set the default font - jsPDF standard fonts already support
  // normal, bold, italic, and bolditalic variants
  doc.setFont(settings.font, "normal");
}
