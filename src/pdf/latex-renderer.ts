// @ts-nocheck
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

// Initialize MathJax (fallback path when global MathJax isn't available)
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

function parseSizeToPt(value?: string | null): number {
	if (!value) return 0;
	const trimmed = value.trim();
	const num = parseFloat(trimmed);
	if (Number.isNaN(num)) return 0;
	if (trimmed.endsWith("pt")) return num;
	if (trimmed.endsWith("px")) return num * 0.75;
	if (trimmed.endsWith("em")) return num * 12;
	if (trimmed.endsWith("ex")) return num * 8;
	return num;
}

function sizeFromViewBox(svgEl: SVGElement): { width: number; height: number } {
	const viewBox = svgEl.getAttribute("viewBox");
	if (!viewBox) return { width: 0, height: 0 };
	const parts = viewBox.split(/\s+/).map((v) => parseFloat(v));
	if (parts.length !== 4 || parts.some((v) => Number.isNaN(v))) {
		return { width: 0, height: 0 };
	}
	return { width: parts[2], height: parts[3] };
}

async function render(latex: string, display: boolean): Promise<SvgResult | null> {
	try {
		const globalMathJax = (globalThis as any)?.MathJax;
		if (globalMathJax?.tex2svgPromise) {
			const wrapper = await globalMathJax.tex2svgPromise(latex, { display });
			const svgEl =
				wrapper?.querySelector?.("svg") ?? (wrapper as SVGElement);
			if (!svgEl) return null;

			let widthPt = parseSizeToPt(svgEl.getAttribute("width"));
			let heightPt = parseSizeToPt(svgEl.getAttribute("height"));
			if (!widthPt || !heightPt) {
				const viewBoxSize = sizeFromViewBox(svgEl);
				widthPt = widthPt || viewBoxSize.width;
				heightPt = heightPt || viewBoxSize.height;
			}
			return { svg: svgEl, width: widthPt, height: heightPt };
		}

		const node = html.convert(latex, { display });
		const svgNode = adaptor.firstChild(node);
		const svgMarkup = adaptor.outerHTML(svgNode);
		const parsedSvg = new DOMParser().parseFromString(svgMarkup, "image/svg+xml")
			.documentElement as SVGElement;

		let widthPt = parseSizeToPt(parsedSvg.getAttribute("width"));
		let heightPt = parseSizeToPt(parsedSvg.getAttribute("height"));
		if (!widthPt || !heightPt) {
			const viewBoxSize = sizeFromViewBox(parsedSvg);
			widthPt = widthPt || viewBoxSize.width;
			heightPt = heightPt || viewBoxSize.height;
		}
		return {
			svg: parsedSvg,
			width: widthPt,
			height: heightPt,
		};
	} catch (error) {
		console.error("MathJax rendering error:", error);
		return null;
	}
}

export const latexRenderer = {
	renderInline(latex: string): Promise<SvgResult | null> {
		return render(latex, false);
	},
	renderDisplay(latex: string): Promise<SvgResult | null> {
		return render(latex, true);
	},
};
