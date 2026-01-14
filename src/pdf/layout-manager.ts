export interface LayoutManager {
  paragraphSpacing: number;
  firstLineIndent: number;       // First-line indent for paragraphs
  listIndent: number;
  blockquoteIndent: number;
  headingSpacing: {
    before: number;
    after: number;
  };
}

export const defaultLayout: LayoutManager = {
  paragraphSpacing: 0,           // APA: no extra paragraph spacing
  firstLineIndent: 36,           // APA: 0.5 inch = 36 points
  listIndent: 36,                // APA: 0.5 inch
  blockquoteIndent: 36,          // APA: 0.5 inch
  headingSpacing: {
    before: 0,                   // APA: no extra space
    after: 0,                    // APA: no extra space
  },
};
