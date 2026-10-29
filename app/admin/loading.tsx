/**
 * Shown while an admin page streams in. Sits below the admin layout, so moving
 * between admin pages shows this instead of freezing on the old page. Also
 * satisfies Cache Components' "needs a boundary below the shared layout" check.
 */
export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="px-6 py-10 md:px-10">
      <p className="text-[16px] font-semibold text-periwinkle">Loading…</p>
    </div>
  );
}
