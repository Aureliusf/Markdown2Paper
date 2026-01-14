import { Plugin, TFile, Notice } from "obsidian";
import { DEFAULT_SETTINGS, PaperExportSettingTab } from "./settings";
import { PaperExportSettings, FormatStyle } from "./types";
import { addRibbonButtons } from "./ui/ribbon-manager";
import { generatePdf } from "./pdf/pdf-generator";
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
        const pdfBlob = await generatePdf(parsedContent, this.settings);
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
}
