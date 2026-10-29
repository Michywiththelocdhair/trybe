import type { ElementType, HTMLAttributes } from "react";

export type ContainerTag =
  | "div"
  | "main"
  | "section"
  | "header"
  | "footer"
  | "article"
  | "aside"
  | "nav";

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  /** Element to render. Pick the semantic tag that fits (main, header, section...). */
  as?: ContainerTag;
}

/**
 * Page-content wrapper: caps width at 1440px, centres itself, and applies the
 * horizontal gutter (24px mobile, 40px from the md breakpoint up).
 */
export function Container({
  as,
  className,
  children,
  ...rest
}: ContainerProps) {
  const As: ElementType = as ?? "div";
  return (
    <As
      {...rest}
      className={`max-w-[1440px] mx-auto px-6 md:px-10 ${className ?? ""}`}
    >
      {children}
    </As>
  );
}
