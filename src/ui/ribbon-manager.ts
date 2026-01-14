import { Notice } from "obsidian";
import PaperExportPlugin from "../main";
import { FormatSelectorModal } from "./format-selector-modal";

export function addRibbonButtons(plugin: PaperExportPlugin) {
	// Format Selector Ribbon Button
	plugin.addRibbonIcon(
		"list",
		"Select Paper Format",
		(evt: MouseEvent) => {
			new FormatSelectorModal(plugin.app, plugin).open();
		}
	);

	// Export Button
	plugin.addRibbonIcon("file-down", "Export to PDF", (evt: MouseEvent) => {
		// This will be wired up to the PDF generation logic later
		new Notice("Exporting to PDF...");
		plugin.exportToPdf();
	});
}
