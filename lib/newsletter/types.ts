export type NewsletterState =
  | { success: true }
  | { success: false; error: string }
  | null;
