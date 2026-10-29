/**
 * Scopes the Studio Stars palette to /studio-stars and its subroutes.
 *
 * Sets ONLY data-theme="studio-stars", which overrides the semantic tokens
 * (--surface, --ink, --accent, --focus) under this subtree so any descendant
 * reaching for `bg-accent`, `text-ink`, etc. paints with sunshine + night
 * without the call site knowing which route it's on.
 *
 * It does NOT paint a background or set a text color — Studio Stars pages
 * can be light (the event page, which uses white cards and the sunshine
 * accent) or dark (future variants). Each page decides its own surface.
 */
export default function StudioStarsLayout({
  children,
}: LayoutProps<"/studio-stars">) {
  return (
    <div data-theme="studio-stars" className="min-h-full">
      {children}
    </div>
  );
}
