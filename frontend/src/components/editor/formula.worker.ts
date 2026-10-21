import { mathjax } from "@mathjax/src/js/mathjax.js";
import { TeX } from "@mathjax/src/js/input/tex.js";
import { SVG } from "@mathjax/src/js/output/svg.js";
import { liteAdaptor } from "@mathjax/src/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "@mathjax/src/js/handlers/html.js";
import { MathJaxTexFont } from "@mathjax/mathjax-tex-font/js/svg.js";
import "@mathjax/src/js/input/tex/ams/AmsConfiguration.js";
import "@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js";
import "@mathjax/src/js/input/tex/boldsymbol/BoldsymbolConfiguration.js";
import "@mathjax/src/js/input/tex/textmacros/TextMacrosConfiguration.js";

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
self.onmessage = (event: MessageEvent<{ id: number; latex: string }>) => {
  const { id, latex } = event.data;
  try {
    if (!latex.trim() || latex.length > 4000) throw new Error("Enter between 1 and 4,000 characters.");
    // A fresh parser keeps user macros local to one expression. No require,
    // autoload, HTML or URL extensions: rendering never fetches external files.
    const document = mathjax.document("", {
      InputJax: new TeX({
        packages: ["base", "ams", "newcommand", "boldsymbol", "textmacros"],
        maxBuffer: 16000, maxMacros: 1000,
        formatError: (_jax: unknown, error: Error) => { throw error; },
      }),
      OutputJax: new SVG({ fontCache: "none", fontData: MathJaxTexFont }),
    });
    let expression = latex.trim();
    for (const [left, right] of [["$$", "$$"], ["\\[", "\\]"], ["\\(", "\\)"], ["$", "$"]]) {
      if (expression.startsWith(left) && expression.endsWith(right) && expression.length >= left.length + right.length) {
        expression = expression.slice(left.length, -right.length).trim(); break;
      }
    }
    if (!expression) throw new Error("Enter a formula inside the delimiters.");
    const output = document.convert(expression, { display: true });
    const svg = adaptor.outerHTML(adaptor.tags(output, "svg")[0]);
    if (!svg.startsWith("<svg") || svg.length > 2000000) throw new Error("This expression is too large.");
    self.postMessage({ id, svg });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
