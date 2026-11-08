import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export function ProductPrice({ value, monthly, note }: { value: number; monthly: string; note: string }) {
  const reduced = useReducedMotion();
  const transition = { duration: reduced ? 0 : .24, ease: [.22, 1, .36, 1] as const };
  return <>
    <div className="product-plan-price" aria-label={`$${value} ${monthly}`}>
      <span aria-hidden="true">$</span>
      <span className="product-price-value" aria-hidden="true">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.strong key={value} initial={{ opacity: 0, y: reduced ? 0 : 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -5 }} transition={transition}>{value}</motion.strong>
        </AnimatePresence>
      </span>
      <span aria-hidden="true">{monthly}</span>
    </div>
    <p className="product-plan-billing" aria-live="polite" aria-atomic="true">
      <AnimatePresence initial={false} mode="wait">
        <motion.span key={note} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .12 }}>{note}</motion.span>
      </AnimatePresence>
    </p>
  </>;
}
