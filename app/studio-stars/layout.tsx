/**
 * Scopes the Studio Stars palette (sunshine yellow + night) to the
 * /studio-stars and /studio-stars/book routes. All children inherit the
 * swapped CSS variables defined in tokens.css under [data-theme="studio-stars"].
 */
export default function StudioStarsLayout({ children }: LayoutProps<"/studio-stars">) {
  return (
    <div
      data-theme="studio-stars"
      className="bg-night text-white min-h-full"
    >
      {children}
    </div>
  );
}
