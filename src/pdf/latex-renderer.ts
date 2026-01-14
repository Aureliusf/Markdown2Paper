// @ts-nocheck
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

// Initialize MathJax
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const tex = new TeX({ packages: AllPackages });
const svg = new SVG({ fontCache: "none" });
const html = mathjax.document("", { InputJax: tex, OutputJax: svg });

export interface SvgResult {
  svg: SVGElement;
  width: number;
  height: number;
}

function render(latex: string, display: boolean): SvgResult | null {
	try {
		const node = html.convert(latex, { display });
		const svgNode = adaptor.firstChild(node);

		const widthEx = parseFloat(adaptor.getAttribute(svgNode, "width"));
		const heightEx = parseFloat(adaptor.getAttribute(svgNode, "height"));
		const widthPt = widthEx * 8; // Assuming 1ex is approx 8px (can be configured)
		const heightPt = heightEx * 8;
		return {
			svg: svgNode as SVGElement,
			width: widthPt,
			height: heightPt,
		};
	} catch (error) {
		console.error("MathJax rendering error:", error);
		return null;
	}
}

export const latexRenderer = {
	renderInline(latex: string): SvgResult | null {
		return render(latex, false);
	},
	renderDisplay(latex: string): SvgResult | null {
		return render(latex, true);
	},
};