import type { ElementType, HTMLAttributes } from "react";
import { Container } from "./container";

export type SectionTag =
  | "section"
  | "div"
  | "header"
  | "footer"
  | "article"
  | "aside";

export type SectionSize = "md" | "lg" | "xl";
export type SectionBackground = "soft" | "indigo" | "night" | "sunshine";

// Literal strings so Tailwind's compiler can see every class.
const SIZE_CLASS: Record<SectionSize, string> = {
  md: "py-16 md:py-20", // 64 / 80px  - compact bands
  lg: "py-20 md:py-28", // 80 / 112px - standard content section (brief: 112-120)
  xl: "py-24 md:py-32", // 96 / 128px - hero
};

const BACKGROUND_CLASS: Record<SectionBackground, string> = {
  soft: "bg-surface-soft",
  indigo: "bg-indigo text-white",
  // `night` and `sunshine` are Studio Stars tokens. They only resolve inside
  // an element with data-theme="studio-stars" (see app/tokens.css), which the
  // /studio-stars route layout already provides. Outside it they paint nothing.
  night: "bg-night text-white",
  sunshine: "bg-sunshine text-night",
};

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  as?: SectionTag;
  /** Vertical rhythm. md = compact, lg = standard content, xl = hero. */
  size?: SectionSize;
  /** Full-width background paint. Omit to inherit from the parent. */
  background?: SectionBackground;
  /**
   * When true (default) children are wrapped in a Container.
   * Set false for edge-to-edge content (the caller handles its own gutters).
   */
  container?: boolean;
}

/** Vertical-rhythm band with an optional full-bleed background. */
export function Section({
  as,
  size = "md",
  background,
  container = true,
  className,
  children,
  ...rest
}: SectionProps) {
  const As: ElementType = as ?? "section";
  const backgroundClass = background ? BACKGROUND_CLASS[background] : "";
  const sizeClass = SIZE_CLASS[size];

  return (
    <As
      {...rest}
      className={`${backgroundClass} ${sizeClass} ${className ?? ""}`}
    >
      {container ? <Container>{children}</Container> : children}
    </As>
  );
}
