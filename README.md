# Markdown to Paper

Transform your markdown drafts into APA-formatted papers for school ready PDFs.

## Features

- **PDF Export** - Export the active markdown file to a PDF with academic formatting.
- **Formatting**
  - Centered, bold title
  - Hierarchical heading styles (H2-H6 mapped to APA levels 1-5)
  - Double-spacing throughout
  - 0.5-inch first-line indent for paragraphs
  - Flush-left reference list with no hanging indent
  - Default Times New Roman font
  - Separate section for references
- **Customizable Settings**
  - Font selection (Times New Roman, Helvetica, Courier)
  - Adjustable page margins (top, right, bottom, left)
  - Format style selector (currently APA only, working on MLA)
- **Rich Content Support**
  - Headings (H1-H6)
  - Paragraphs with proper text flow and wrapping
  - Ordered and unordered lists
  - Tables (basic support via jspdf-autotable)
  - Code blocks (rendered in Courier font)
  - Blockquotes with visual indicator
  - ~Display math (`$$...$$`)~ WIP
- **Citation & Reference Parsing**
  - Extract citations using `[@citationKey]` syntax
  - Parse reference lists from a "References" section
- **Obsidian UI Integration**
  - Ribbon button for quick export
  - Format selector dropdown in ribbon
  - Status bar showing current format style
  - Full settings tab for configuration

## Known Issues & Limitations

- **Inline LaTeX Math** (`$...$`) is not properly rendered in the text flow - display math (`$$...$$`) works, but inline math is logged as a warning
- **No Image Embedding** - Images are not actually embedded; only a placeholder `[Image: alt text]` is shown. Pending implementation
- **Table Styling** - They render out like markdown tables, not APA styling yet
- **Callouts Not Supported** - Obsidian callout syntax (>`[!note]`) is not recognized and will appear as blockquotes

## Installation

### For Developers (From Source)

1. Clone the repository:
   ```bash
   git clone <https://github.com/Aureliusf/Markdown2Paper>
   cd markdown-to-paper
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

4. For production build (minified):
   ```bash
   npm run build
   ```

5. Copy the `src/` folder and `main.js` (after build) to your Obsidian vault's `.obsidian/plugins/markdown-to-paper/` directory (or git clone directly into your plugin directory)

6. Reload Obsidian and enable the plugin in **Settings > Community plugins**

## Usage

1. Open a markdown file you want to export
2. (Optional) Configure settings via the ribbon button or settings tab
3. Click the **Export to PDF** ribbon button (file icon with down arrow)
4. The PDF will download to your default download location

### Markdown Requirements

- Title: Set via frontmatter `title: "Your Title"` or first H1 heading
- Font: Defaults to Times (Times New Roman equivalent)
- Margins: Default 1 inch on all sides
- Citations: Use `[@citationKey]` anywhere in text
- References: Create a `## References` or `## Citations`heading 2 followed by a list

## Development

### Project Structure

```
markdown-to-paper/
├── src/
│   ├── main.ts                    # Plugin entry point
│   ├── settings.ts                # Settings tab implementation
│   ├── types.ts                   # TypeScript interfaces
│   ├── pdf/
│   │   ├── pdf-generator.ts       # Main PDF generation logic
│   │   ├── formatter-factory.ts   # Factory for format-specific formatters
│   │   ├── font-loader.ts         # Font loading utilities
│   │   ├── layout-manager.ts      # Layout configuration
│   │   ├── latex-renderer.ts      # MathJax LaTeX rendering WIP
│   │   └── formatters/
│   │       ├── base-formatter.ts  # Abstract base class
│   │       └── apa-formatter.ts   # APA 7th edition formatter
│   ├── ui/
│   │   ├── ribbon-manager.ts      # Ribbon button setup
│   │   └── format-selector-modal.ts # Format selection modal
│   └── utils/
│       └── markdown-parser.ts     # Markdown parsing with unified/remark
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
└── manifest.json
```

### Available Scripts

- `npm run dev` - Build in watch mode for development
- `npm run build` - Production build with minification
- `npm run lint` - Run ESLint for code quality
- `npm run version` - Bump version and update manifest

## License

MIT License

Copyright (c) 2026 Aurelio Florez

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
