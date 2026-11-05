import { motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState, type ReactNode } from "react";

/** Keep native summary keyboard behavior and retain the body until its exit finishes. */
export function ProductDisclosure({ question, children }: { question: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [present, setPresent] = useState(false);
  const target = useRef(false);
  const reduced = useReducedMotion();
  const id = useId();
  return <details className="product-disclosure" open={present} data-expanded={expanded}>
    <summary aria-expanded={expanded} aria-controls={id} onClick={event => {
      event.preventDefault();
      target.current = !target.current;
      if (target.current) setPresent(true);
      setExpanded(target.current);
    }}>{question}<span aria-hidden="true">+</span></summary>
    <motion.div id={id} className="product-disclosure-body" inert={!expanded} aria-hidden={!expanded}
      initial={false} animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
      transition={{ duration: reduced ? 0 : expanded ? .26 : .18, ease: [.22, 1, .36, 1] }}
      onAnimationComplete={() => { if (!target.current) setPresent(false); }}>
      {children}
    </motion.div>
  </details>;
}
