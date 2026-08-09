import { Container, Section } from "@radix-ui/themes";
import type { PropsWithChildren } from "react";

type PageContainerProps = PropsWithChildren<{
  className?: string;
  measure?: "wide" | "reading";
}>;

type PageSectionProps = PropsWithChildren<{
  className?: string;
  density?: "compact" | "standard" | "spacious";
  id?: string;
  ariaLabel?: string;
}>;

export function PageContainer({
  children,
  className = "",
  measure = "wide",
}: PageContainerProps) {
  return (
    <Container
      className={`ff-page-container ff-page-container-${measure} ${className}`.trim()}
      size={measure === "reading" ? "3" : "4"}
      px={{ initial: "4", sm: "6" }}
    >
      {children}
    </Container>
  );
}

export function PageSection({
  children,
  className = "",
  density = "standard",
  id,
  ariaLabel,
}: PageSectionProps) {
  const size =
    density === "compact"
      ? ("1" as const)
      : density === "spacious"
        ? ({ initial: "2", md: "3" } as const)
        : ("2" as const);

  return (
    <Section
      className={`ff-page-section ${className}`.trim()}
      size={size}
      id={id}
      aria-label={ariaLabel}
    >
      {children}
    </Section>
  );
}
