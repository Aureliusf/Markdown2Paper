import { App, PluginSettingTab, Setting } from "obsidian";
import PaperExportPlugin from "./main";
import { FormatStyle, PaperExportSettings, AVAILABLE_FONTS } from "./types";

export const DEFAULT_SETTINGS: PaperExportSettings = {
  selectedFormatStyle: FormatStyle.APA,
  font: "Times",  // Changed from "Times New Roman" to jsPDF name
  margins: {
    top: 1,
    right: 1,
    bottom: 1,
    left: 1,
  },
};

export class PaperExportSettingTab extends PluginSettingTab {
  plugin: PaperExportPlugin;

  constructor(app: App, plugin: PaperExportPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Paper Export Settings" });

    new Setting(containerEl)
      .setName("Formatting Style")
      .setDesc("Select the citation and formatting style for the exported PDF.")
      .addDropdown((dropdown) => {
        for (const style of Object.values(FormatStyle)) {
          dropdown.addOption(style, style);
        }
        dropdown
          .setValue(this.plugin.settings.selectedFormatStyle)
          .onChange(async (value: FormatStyle) => {
            this.plugin.settings.selectedFormatStyle = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Font")
      .setDesc("Select the font for the exported PDF.")
      .addDropdown((dropdown) => {
        AVAILABLE_FONTS.forEach((font) => {
          dropdown.addOption(font.jsPdfName, font.displayName);
        });
        dropdown
          .setValue(this.plugin.settings.font)
      .onChange(async (value) => {
        this.plugin.settings.font = value;
        await this.plugin.saveSettings();
      });
  });

containerEl.createEl("h3", { text: "Margins (inches)" });

new Setting(containerEl)
  .setName("Top")
  .addText((text) =>
    text
      .setPlaceholder("1.0")
      .setValue(this.plugin.settings.margins.top.toString())
      .onChange(async (value) => {
        this.plugin.settings.margins.top = this.parseAndClamp(value, 0, 3, 1);
        await this.plugin.saveSettings();
      })
  );

new Setting(containerEl)
  .setName("Right")
  .addText((text) =>
    text
      .setPlaceholder("1.0")
      .setValue(this.plugin.settings.margins.right.toString())
      .onChange(async (value) => {
        this.plugin.settings.margins.right = this.parseAndClamp(value, 0, 3, 1);
        await this.plugin.saveSettings();
      })
  );

new Setting(containerEl)
  .setName("Bottom")
  .addText((text) =>
    text
      .setPlaceholder("1.0")
      .setValue(this.plugin.settings.margins.bottom.toString())
      .onChange(async (value) => {
        this.plugin.settings.margins.bottom = this.parseAndClamp(value, 0, 3, 1);
        await this.plugin.saveSettings();
      })
  );

new Setting(containerEl)
  .setName("Left")
  .addText((text) =>
    text
      .setPlaceholder("1.0")
      .setValue(this.plugin.settings.margins.left.toString())
      .onChange(async (value) => {
        this.plugin.settings.margins.left = this.parseAndClamp(value, 0, 3, 1);
        await this.plugin.saveSettings();
      })
  );
}

private parseAndClamp(value: string, min: number, max: number, def: number): number {
const parsed = parseFloat(value);
if (isNaN(parsed)) return def;
return Math.max(min, Math.min(max, parsed));
}
}
