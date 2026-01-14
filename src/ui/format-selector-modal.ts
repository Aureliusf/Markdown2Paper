import { App, Modal, Setting } from "obsidian";
import { FormatStyle } from "../types";
import PaperExportPlugin from "../main";

export class FormatSelectorModal extends Modal {
  plugin: PaperExportPlugin;

  constructor(app: App, plugin: PaperExportPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "Select Citation Format" });

    new Setting(contentEl)
      .setName("Formatting Style")
      .setDesc("Choose the citation and formatting style for the exported PDF.")
      .addDropdown((dropdown) => {
        for (const style of Object.values(FormatStyle)) {
          dropdown.addOption(style, style);
        }
        dropdown
          .setValue(this.plugin.settings.selectedFormatStyle)
          .onChange(async (value: FormatStyle) => {
            this.plugin.settings.selectedFormatStyle = value;
            await this.plugin.saveSettings();
            this.plugin.updateStatusBar();
          });
      });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
