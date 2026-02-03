export enum FormatStyle {
  APA = "APA",
  MLA = "MLA",
  // Chicago = "Chicago", // Future option
}

export interface FontOption {
  displayName: string;  // User-friendly name for UI
  jsPdfName: string;    // jsPDF internal font name
}

export const AVAILABLE_FONTS: FontOption[] = [
  { displayName: "Times New Roman", jsPdfName: "Times" },
  { displayName: "Helvetica", jsPdfName: "Helvetica" },
  { displayName: "Courier", jsPdfName: "Courier" },
];

export interface PaperExportSettings {
  selectedFormatStyle: FormatStyle;
  font: string;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}
