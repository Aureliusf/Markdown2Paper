import { BaseFormatter, ImageResolver } from "./formatters/base-formatter";
import { APAFormatter } from "./formatters/apa-formatter";
import jspdf from "jspdf";
import { PaperExportSettings } from "../types";
import { FormatStyle } from "../types";

/**
 * Factory class for creating formatters based on format style selection
 */
export class FormatterFactory {
  /**
   * Creates a formatter instance based on the selected format style
   * @param doc - The jsPDF document instance
   * @param y - Initial Y position
   * @param settings - Paper export settings
   * @returns A formatter instance
   */
  static createFormatter(
    doc: jspdf,
    y: number,
    settings: PaperExportSettings,
    imageResolver?: ImageResolver
  ): BaseFormatter {
    switch (settings.selectedFormatStyle) {
      case FormatStyle.APA:
        return new APAFormatter(doc, y, settings, imageResolver);

      // Future format styles can be added here:
      // case FormatStyle.MLA:
      //   return new MLAFormatter(doc, y, settings);
      // case FormatStyle.Chicago:
      //   return new ChicagoFormatter(doc, y, settings);

      default:
        throw new Error(
          `Unsupported format style: ${settings.selectedFormatStyle}. ` +
          `Available formats: ${Object.values(FormatStyle).join(", ")}`
        );
    }
  }

  /**
   * Gets the available format styles
   * @returns Array of available FormatStyle values
   */
  static getAvailableFormats(): FormatStyle[] {
    return Object.values(FormatStyle);
  }

  /**
   * Checks if a format style is supported
   * @param formatStyle - The format style to check
   * @returns True if supported, false otherwise
   */
  static isFormatSupported(formatStyle: FormatStyle): boolean {
    return Object.values(FormatStyle).includes(formatStyle);
  }
}
