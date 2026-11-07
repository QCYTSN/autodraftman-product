import { useId } from "react";
import type { DemoLanguage } from "./cases";
import { heroSvgGlyphs } from "./heroSvgGlyphs";

type Props = { language: DemoLanguage; revision: number };

// A visual explanation of the method, using the requested font as actual SVG paths.
// The displaced V is a controlled illustration, not a generated experiment result.
export function HeroSvgWord({ language, revision }: Props) {
  const gradient = useId();
  const [s, v, g] = heroSvgGlyphs;

  return (
    <span className="demo-title-format hero-svg-word">
      <span className="demo-visually-hidden">SVG</span>
      <span className="hero-relation-label" aria-hidden="true">
        {language === "zh" ? "关系重建" : "Relations"}
      </span>
      <svg key={revision} className="hero-svg-scene" viewBox="-5 -13 198 115" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2=".3">
            <stop offset="0" stopColor="#6243ce" />
            <stop offset="1" stopColor="#4365cc" />
          </linearGradient>
        </defs>
        <g className="hero-word-relations">
          <path className="hero-relation-line" pathLength="1"
            d={`M${s.center} 3V-3H${g.center}V3M${v.center} -3V3`} />
          {heroSvgGlyphs.map(glyph => <circle key={glyph.letter} cx={glyph.center} cy="-3" r="3.3" />)}
        </g>
        <path className="hero-glyph" fill={`url(#${gradient})`} d={s.path} />
        <path className="hero-glyph-ghost" d={v.path} transform="translate(3 8)" />
        <g className="hero-local-refinement">
          <path className="hero-glyph" fill={`url(#${gradient})`} d={v.path} />
          <circle className="hero-vector-anchor" cx={v.center} cy={v.bottom} r="3.3" />
          <circle className="hero-local-inspection" cx={v.center} cy={v.bottom} r="9" />
        </g>
        <path className="hero-glyph" fill={`url(#${gradient})`} d={g.path} />
      </svg>
      <span className="hero-refinement-label" aria-hidden="true">
        <svg viewBox="0 0 14 14" focusable="false"><path d="M10.8 5a4.4 4.4 0 1 1-2.1-2.1M10.8 1.7V5H7.5" /></svg>
        {language === "zh" ? "局部修复" : "Refinement"}
      </span>
    </span>
  );
}
