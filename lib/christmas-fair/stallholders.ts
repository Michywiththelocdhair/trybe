/**
 * Confirmed Christmas Fair stallholders shown in "Meet the stallholders" on
 * /christmas-fair. Every vendor here has agreed to Trybe sharing their
 * business, photos and handle on the website and socials.
 *
 * To add one: put a square-ish logo and 1–3 photos in
 * public/images/christmas-fair/stallholders/ and add an entry below. Keep bios
 * to two or three lines. Prices are deliberately not shown.
 */
export type Stallholder = {
  id: string;
  name: string;
  /** Short label under the logo, e.g. "Art prints". */
  kind: string;
  category: "Crafts & gifts" | "Food & treats" | "Children’s activities" | "Something else";
  bio: string;
  logo: string;
  photos: { src: string; alt: string }[];
  instagram: string;
  website?: { url: string; label: string };
};

const IMG = "/images/christmas-fair/stallholders";

export const STALLHOLDERS: Stallholder[] = [
  {
    id: "sorcha-bridge",
    name: "Sorcha Bridge Photography",
    kind: "Art prints",
    category: "Crafts & gifts",
    bio: "Limited-edition artworks that mix photography with digital techniques and specialist print finishes. Vibrant birds, colour and texture: thoughtful Christmas gifts.",
    logo: `${IMG}/sorcha-bridge-logo.jpg`,
    photos: [
      { src: `${IMG}/sorcha-bridge-1.jpg`, alt: "Art print of a pink flamingo against a silver moon" },
      { src: `${IMG}/sorcha-bridge-2.jpg`, alt: "Art print of two colourful birds facing each other" },
      { src: `${IMG}/sorcha-bridge-3.jpg`, alt: "Art print of a hummingbird in front of a gold moon" },
    ],
    instagram: "sorchabridge",
    website: { url: "https://www.sorchabridge.com/", label: "sorchabridge.com" },
  },
  {
    id: "house17",
    name: "HOUSE17 Jewellery",
    kind: "Handmade jewellery",
    category: "Crafts & gifts",
    bio: "Nicola hand-carves every piece in her East London workshop, then casts it in recycled silver or 18ct gold vermeil using the ancient lost-wax technique.",
    logo: `${IMG}/house17-logo.jpg`,
    photos: [{ src: `${IMG}/house17-1.jpg`, alt: "Gold pendant necklaces from HOUSE17" }],
    instagram: "hous_e17",
    website: { url: "https://house17.co.uk/", label: "house17.co.uk" },
  },
  {
    id: "bespoke-butterflies",
    name: "Bespoke Butterflies",
    kind: "Framed butterflies",
    category: "Crafts & gifts",
    // Per Nyah (26 Nov): show the hand-framed butterflies only, not ornaments.
    bio: "Hand-curated butterflies from checkable, sustainable sources, set and pinned in handmade wooden frames. Straight from Portobello Road Market.",
    logo: `${IMG}/bespoke-butterflies-logo.jpg`,
    photos: [{ src: `${IMG}/bespoke-butterflies-1.jpg`, alt: "A blue butterfly in a handmade dark wooden frame" }],
    instagram: "Bespoke_Butterflies",
    website: { url: "https://visitportobello.com/businesses/bespoke-butterflies/", label: "Visit Portobello" },
  },
  {
    id: "cupcake-avenue",
    name: "The Cupcake Avenue",
    kind: "Festive cupcakes",
    category: "Food & treats",
    bio: "It’s beginning to look a lot like Christmas! Festive cupcakes, individually packaged, so they’re easy to take home (if they last that long).",
    logo: `${IMG}/cupcake-avenue-logo.jpg`,
    photos: [{ src: `${IMG}/cupcake-avenue-1.jpg`, alt: "A box of festive decorated cupcakes" }],
    instagram: "cupcakeav",
    website: { url: "https://cupcakeavenue.wixsite.com/cupcakeav", label: "Cupcake Avenue" },
  },
];
