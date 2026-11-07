// Read authored text structure only. Positioned glyphs and paths cannot reliably
// reveal a formula's semantics; those remain an explicit user transcription.
const greek = Object.fromEntries([
  ["α", "alpha"], ["β", "beta"], ["γ", "gamma"], ["δ", "delta"], ["ε", "varepsilon"], ["ϵ", "epsilon"],
  ["ζ", "zeta"], ["η", "eta"], ["θ", "theta"], ["ϑ", "vartheta"], ["ι", "iota"], ["κ", "kappa"],
  ["λ", "lambda"], ["μ", "mu"], ["ν", "nu"], ["ξ", "xi"], ["π", "pi"], ["ϖ", "varpi"],
  ["ρ", "rho"], ["ϱ", "varrho"], ["σ", "sigma"], ["ς", "varsigma"], ["τ", "tau"], ["υ", "upsilon"],
  ["φ", "varphi"], ["ϕ", "phi"], ["χ", "chi"], ["ψ", "psi"], ["ω", "omega"],
  ["Γ", "Gamma"], ["Δ", "Delta"], ["Θ", "Theta"], ["Λ", "Lambda"], ["Ξ", "Xi"], ["Π", "Pi"],
  ["Σ", "Sigma"], ["Υ", "Upsilon"], ["Φ", "Phi"], ["Ψ", "Psi"], ["Ω", "Omega"],
].map(([glyph, name]) => [glyph, `\\${name} `]));
const accents = { "\u0302": "hat", "\u0304": "bar", "\u0303": "tilde", "\u0307": "dot", "\u0308": "ddot", "\u20d7": "vec" };
const escapeText = value => value.replace(/[\\{}%$&#_^~]/g, ch => ({ "\\": "\\textbackslash{}", "^": "\\textasciicircum{}", "~": "\\textasciitilde{}" }[ch] || `\\${ch}`));

function encodeRun(value, style) {
  // Prose keeps spaces/hyphens and upright text. Mathematical symbols, digits and
  // single Latin variables remain math. No dictionary of figure titles is used.
  return value.split(/([\p{Script=Greek}\p{Sm}\u{1D400}-\u{1D7FF}][\p{M}]*)/u).map(part => {
    if (!part) return "";
    if (/[A-Za-z]{2,}|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(part)) {
      let text = escapeText(part);
      if (style.fontStyle === "italic") text = `\\textit{${text}}`;
      if (style.fontWeight === "bold" || Number(style.fontWeight) >= 600) text = `\\textbf{${text}}`;
      return `\\text{${text}}`;
    }
    return Array.from(part).map(ch => greek[ch] || ("%$&#_{}".includes(ch) ? `\\${ch}` : ch)).join("")
      .replace(/(\\[a-zA-Z]+ |[^\s])([\u0302\u0304\u0303\u0307\u0308\u20d7])/g, (_, base, accent) => `\\${accents[accent]}{${base.trim()}}`);
  }).join("");
}

export function textToLatex(element) {
  if (!["text", "tspan", "textPath"].includes(element?.localName)) return null;
  let approximate = false;
  const read = node => {
    const style = getComputedStyle(node);
    if (node.localName === "textPath" || (node !== element && ["x", "y", "dx", "dy", "rotate"].some(name => node.hasAttribute(name)))) approximate = true;
    let result = "", base = "", scripts = new Map();
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) { result += encodeRun(child.data, style); scripts.clear(); }
      else if (["tspan", "textPath"].includes(child.localName)) {
        const content = read(child);
        const shift = child.style.getPropertyValue("baseline-shift") || child.getAttribute("baseline-shift") || getComputedStyle(child).getPropertyValue("baseline-shift");
        const parentShift = style.getPropertyValue("baseline-shift");
        if (["sub", "super"].includes(shift) && (child.hasAttribute("baseline-shift") || child.style.getPropertyValue("baseline-shift") || shift !== parentShift)) {
          const marker = shift === "sub" ? "_" : "^";
          if (!scripts.size) base = result.trimEnd() || "{}";
          scripts.set(marker, (scripts.get(marker) || "") + content.trim());
          result = base + [...scripts].map(([kind, value]) => `${kind}{${value}}`).join("");
        } else { result += content; scripts.clear(); if (shift && !["baseline", "0", "0px", parentShift].includes(shift)) approximate = true; }
      }
    }
    return result;
  };
  return { source: read(element).trim(), approximate };
}
