export interface LayoutManager {
  paragraphSpacing: number;
  listIndent: number;
  blockquoteIndent: number;
  headingSpacing: {
    before: number;
    after: number;
  };
}

export const defaultLayout: LayoutManager = {
  paragraphSpacing: 10,
  listIndent: 15,
  blockquoteIndent: 10,
  headingSpacing: {
    before: 10,
    after: 5,
  },
};
