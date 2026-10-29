import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import Link from "next/link";

export type ButtonVariant =
  | "primary"
  | "outline"
  | "on-dark"
  | "studio-stars"
  | "studio-stars-outline"
  /** Night-colored outline for Studio Stars CTAs sitting on a LIGHT
   *  background (the event page uses this on its white hero). The
   *  plain `studio-stars-outline` variant is white-on-night and only
   *  works on dark surfaces. */
  | "studio-stars-outline-light";

export type ButtonSize = "md" | "sm";

type CommonProps = {
  /** Visual treatment. Defaults to "primary". */
  variant?: ButtonVariant;
  /** "md" = 52px tall, "sm" = 48px tall. Defaults to "md". */
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
};

type ButtonAsButtonProps = CommonProps & {
  as?: "button";
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps>;

type ButtonAsAnchorProps = CommonProps & {
  as: "a";
  href: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps | "href">;

export type ButtonProps = ButtonAsButtonProps | ButtonAsAnchorProps;

const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

const base = [
  "inline-flex items-center justify-center text-center",
  "font-sans leading-[1.2] no-underline",
  "rounded-pill",
  "cursor-pointer transition-colors duration-150",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

const sizes: Record<ButtonSize, string> = {
  md: "min-h-[var(--btn-h)] px-6 text-[17px]",
  sm: "min-h-[var(--btn-h-sm)] px-5 text-base",
};

const variants: Record<ButtonVariant, string> = {
  // Purple fill, white text.
  primary:
    "bg-trybe-purple text-white font-extrabold not-disabled:hover:bg-indigo",

  // 2px purple border, purple text, transparent fill.
  outline:
    "border-2 border-trybe-purple bg-transparent text-trybe-purple font-bold not-disabled:hover:bg-blush",

  // White fill for CTAs sitting on an indigo background. The focus state is a
  // doubled ring (indigo spacer + white outer ring) so it stays visible on indigo.
  "on-dark":
    "bg-white text-indigo font-extrabold not-disabled:hover:bg-blush " +
    "focus-visible:outline-transparent " +
    "focus-visible:[box-shadow:0_0_0_3px_var(--indigo),0_0_0_6px_var(--white)]",

  // Sunshine fill on night. Uses raw tokens that are now defined at :root,
  // so the variant works both inside and outside [data-theme="studio-stars"].
  "studio-stars":
    "bg-sunshine text-night font-extrabold not-disabled:hover:bg-cream",

  // 2px white border for secondary actions on night.
  "studio-stars-outline":
    "border-2 border-white bg-transparent text-white font-bold not-disabled:hover:bg-white/10",

  // 2px night border for secondary actions on light Studio Stars surfaces.
  "studio-stars-outline-light":
    "border-2 border-night bg-transparent text-night font-bold not-disabled:hover:bg-night/5",
};

export function Button({
  as = "button",
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = cx(base, sizes[size], variants[variant], className);

  if (as === "a") {
    const anchorProps = rest as Omit<
      ButtonAsAnchorProps,
      keyof CommonProps | "as"
    >;
    // Internal routes go through next/link for client-side navigation and
    // prefetching. Everything else (external URLs, hash links, mailto:, tel:)
    // stays a plain <a>, which Link would otherwise warn or error on.
    const isInternalRoute =
      typeof anchorProps.href === "string" &&
      anchorProps.href.startsWith("/") &&
      !anchorProps.href.startsWith("//");

    if (isInternalRoute) {
      // `next/link` accepts the same anchor attributes; it just wraps the
      // navigation in client-side routing.
      return (
        <Link {...anchorProps} className={classes}>
          {children}
        </Link>
      );
    }
    return (
      <a {...anchorProps} className={classes}>
        {children}
      </a>
    );
  }

  const { type = "button", ...buttonProps } = rest as Omit<
    ButtonAsButtonProps,
    keyof CommonProps | "as"
  >;
  return (
    <button {...buttonProps} type={type} className={classes}>
      {children}
    </button>
  );
}
