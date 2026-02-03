import { Plugin, TFile, Notice } from "obsidian";
import { DEFAULT_SETTINGS, PaperExportSettingTab } from "./settings";
import { PaperExportSettings, FormatStyle } from "./types";
import { addRibbonButtons } from "./ui/ribbon-manager";
import { generatePdf } from "./pdf/pdf-generator";
import { ImageInfo } from "./pdf/formatters/base-formatter";
import { parseMarkdown } from "./utils/markdown-parser";
import { saveAs } from "file-saver";

export default class PaperExportPlugin extends Plugin {
  settings: PaperExportSettings;
  statusBarItemEl: HTMLElement;

  async onload() {
    await this.loadSettings();

    // Add ribbon buttons
    addRibbonButtons(this);

    // Add a status bar item to show the current format
    this.statusBarItemEl = this.addStatusBarItem();
    this.updateStatusBar();

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new PaperExportSettingTab(this.app, this));

    // Add the export command
    this.addCommand({
      id: "export-to-pdf",
      name: "Export to PDF",
      callback: () => this.exportToPdf(),
    });
  }

  onunload() {}

  async loadSettings() {
    const loaded = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
    
    // Migrate old display names to jsPDF font names
    const fontMigration: Record<string, string> = {
      "Times New Roman": "Times",
      "Arial": "Helvetica",
      "Courier New": "Courier",
      "Georgia": "Times",      // Fallback to Times
      "Verdana": "Helvetica",  // Fallback to Helvetica
      "Trebuchet MS": "Helvetica",
      "Comic Sans MS": "Helvetica",
      "Impact": "Helvetica",
      "Lucida Console": "Courier",
    };
    
    if (fontMigration[this.settings.font]) {
      this.settings.font = fontMigration[this.settings.font]!;
      await this.saveSettings();
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  updateStatusBar() {
    this.statusBarItemEl.setText(
      `Paper Format: ${this.settings.selectedFormatStyle}`
    );
  }

  async exportToPdf() {
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile) {
      new Notice(`Exporting ${activeFile.basename} to PDF...`);
      try {
        const markdownContent = await this.app.vault.read(activeFile);
        const parsedContent = parseMarkdown(markdownContent);
        const imageResolver = async (node: any): Promise<ImageInfo | null> => {
          if (!node?.url) return null;
          const linkPath = decodeURI(String(node.url)).trim();
          const target = this.app.metadataCache.getFirstLinkpathDest(
            linkPath,
            activeFile.path
          );
          if (!target) {
            console.warn("Image not found for link:", linkPath);
            return null;
          }

          const arrayBuffer = await this.app.vault.readBinary(target);
          const extension = target.extension.toLowerCase();
          const mime =
            extension === "png"
              ? "image/png"
              : extension === "jpg" || extension === "jpeg"
                ? "image/jpeg"
                : extension === "gif"
                  ? "image/gif"
                  : extension === "webp"
                    ? "image/webp"
                    : extension === "svg"
                      ? "image/svg+xml"
                      : "image/png";

          const base64 = this.arrayBufferToBase64(arrayBuffer);
          const dataUrl = `data:${mime};base64,${base64}`;
          const size = await this.getImageSize(dataUrl, mime, arrayBuffer);
          return {
            dataUrl,
            width: size.width,
            height: size.height,
          };
        };

        const pdfBlob = await generatePdf(parsedContent, this.settings, imageResolver);
        saveAs(pdfBlob, `${activeFile.basename}.pdf`);
        new Notice(`Successfully exported ${activeFile.basename} to PDF.`);
      } catch (error) {
        console.error("Error exporting to PDF:", error);
        new Notice("Error exporting to PDF. See console for details.");
      }
    } else {
      new Notice("No active file to export.");
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }

  private parseSizeToPx(value?: string | null): number {
    if (!value) return 0;
    const trimmed = value.trim();
    const num = parseFloat(trimmed);
    if (Number.isNaN(num)) return 0;
    if (trimmed.endsWith("px")) return num;
    if (trimmed.endsWith("pt")) return num * 1.3333;
    if (trimmed.endsWith("em")) return num * 16;
    if (trimmed.endsWith("ex")) return num * 8;
    return num;
  }

  private async getImageSize(
    dataUrl: string,
    mime: string,
    arrayBuffer?: ArrayBuffer
  ): Promise<{ width: number; height: number }> {
    if (mime === "image/svg+xml" && arrayBuffer) {
      const svgText = new TextDecoder().decode(arrayBuffer);
      const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
      const svgEl = doc.documentElement;
      let width = this.parseSizeToPx(svgEl.getAttribute("width"));
      let height = this.parseSizeToPx(svgEl.getAttribute("height"));
      if (!width || !height) {
        const viewBox = svgEl.getAttribute("viewBox");
        if (viewBox) {
          const parts = viewBox.split(/\s+/).map((v) => parseFloat(v));
          if (parts.length === 4 && parts.every((v) => !Number.isNaN(v))) {
            width = width || parts[2]!;
            height = height || parts[3]!;
          }
        }
      }
      if (width && height) {
        return { width, height };
      }
    }

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = dataUrl;
    });

    return {
      width: img.naturalWidth || 300,
      height: img.naturalHeight || 150,
    };
  }
}
