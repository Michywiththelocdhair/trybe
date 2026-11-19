"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/button";
import { ALLOWED_UPLOAD_TYPES, FAIR } from "@/lib/christmas-fair/config";
import { supabaseBrowser } from "@/lib/supabase/client";
import { createVendorUploadUrls, finishVendorUploads } from "@/app/(site)/christmas-fair/actions";

type AllowedType = (typeof ALLOWED_UPLOAD_TYPES)[number];

/** Some phones leave HEIC files without a MIME type; fall back to the extension. */
function fileType(file: File): AllowedType | null {
  if ((ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.type)) return file.type as AllowedType;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "heic") return "image/heic";
  if (ext === "heif") return "image/heif";
  return null;
}

export function checkVendorFiles(logo: File | null, photos: File[], { requireLogo, requirePhotos }: { requireLogo: boolean; requirePhotos: boolean }): string | null {
  if (requireLogo && !logo) return "Please add your logo.";
  if (requirePhotos && photos.length === 0) return "Please add at least one photo of your stall, products or activity.";
  if (photos.length > FAIR.maxVendorPhotos) return `Please choose up to ${FAIR.maxVendorPhotos} photos.`;
  for (const file of [...(logo ? [logo] : []), ...photos]) {
    if (!fileType(file)) return `${file.name} isn’t a supported image. Please use JPG, PNG, WebP or HEIC.`;
    if (file.size > FAIR.maxUploadBytes) return `${file.name} is over 5MB. Please choose a smaller image.`;
  }
  return null;
}

/** Uploads straight to Supabase Storage with signed URLs, then records them. */
export async function uploadVendorFiles(token: string, logo: File | null, photos: File[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const files = [...(logo ? [{ kind: "logo" as const, file: logo }] : []), ...photos.map((file) => ({ kind: "photo" as const, file }))];
  if (files.length > 0) {
    const urls = await createVendorUploadUrls({
      token,
      files: files.map(({ kind, file }) => ({ kind, type: fileType(file) ?? file.type, size: file.size })),
    });
    if (!urls.ok) return urls;
    const bucket = supabaseBrowser().storage.from(FAIR.uploadBucket);
    for (let i = 0; i < files.length; i += 1) {
      const target = urls.uploads[i];
      const { error } = await bucket.uploadToSignedUrl(target.path, target.token, files[i].file, { contentType: fileType(files[i].file) ?? undefined });
      if (error) return { ok: false, error: `We couldn’t upload ${files[i].file.name}. Please check your connection and try again.` };
    }
  }
  const finished = await finishVendorUploads(token);
  return finished.ok ? { ok: true } : finished;
}

export function VendorFileFields({
  logo,
  photos,
  onLogo,
  onPhotos,
  requireLogo,
}: {
  logo: File | null;
  photos: File[];
  onLogo: (file: File | null) => void;
  onPhotos: (files: File[]) => void;
  requireLogo: boolean;
}) {
  const accept = ALLOWED_UPLOAD_TYPES.join(",") + ",.heic,.heif";
  return (
    <fieldset className="grid gap-4 border-0 p-0 sm:grid-cols-2">
      <legend className="mb-2 font-extrabold">Your logo and photos <span className="font-semibold text-[color:var(--muted-plum)]">(optional, but they help us promote your stall on the website and socials)</span></legend>
      <label className="flex flex-col gap-2 rounded-[16px] border-2 border-dashed border-[#BA85BA] bg-[#FBF5EC] p-4 font-bold">
        Logo{requireLogo ? "" : " (optional)"}
        <input type="file" accept={accept} required={requireLogo} onChange={(e) => onLogo(e.currentTarget.files?.[0] ?? null)} className="text-sm font-semibold" />
        <span className="text-sm font-semibold text-[color:var(--muted-plum)]">{logo ? `Selected: ${logo.name}` : "JPG, PNG, WebP or HEIC, up to 5MB."}</span>
      </label>
      <label className="flex flex-col gap-2 rounded-[16px] border-2 border-dashed border-[#BA85BA] bg-[#FBF5EC] p-4 font-bold">
        Photos (optional, up to {FAIR.maxVendorPhotos})
        <input type="file" accept={accept} multiple onChange={(e) => onPhotos(Array.from(e.currentTarget.files ?? []).slice(0, FAIR.maxVendorPhotos))} className="text-sm font-semibold" />
        <span className="text-sm font-semibold text-[color:var(--muted-plum)]">{photos.length ? `${photos.length} selected` : "Your stall, products or activity in action."}</span>
      </label>
    </fieldset>
  );
}

/** Used on a vendor's own page to add or replace their logo and photos. */
export function VendorUploadForm({ token, hasLogo, hasPhotos }: { token: string; hasLogo: boolean; hasPhotos: boolean }) {
  const [logo, setLogo] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = checkVendorFiles(logo, photos, { requireLogo: !hasLogo && photos.length === 0, requirePhotos: false });
    if (problem) return setMessage({ ok: false, text: problem });
    if (!logo && photos.length === 0) return setMessage({ ok: false, text: "Choose a logo or photos to upload." });
    startTransition(async () => {
      const result = await uploadVendorFiles(token, logo, photos);
      setMessage(result.ok ? { ok: true, text: "Thanks, your images are saved. Refresh the page to see them." } : { ok: false, text: result.error });
    });
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <VendorFileFields logo={logo} photos={photos} onLogo={setLogo} onPhotos={setPhotos} requireLogo={false} />
      {!hasLogo || !hasPhotos ? <p className="m-0 text-sm font-bold">Optional: add a logo or photos and we’ll use them to promote your stall.</p> : null}
      {message ? <p role={message.ok ? "status" : "alert"} className={`m-0 rounded-xl p-3 font-semibold ${message.ok ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>{message.text}</p> : null}
      <div><Button type="submit" disabled={pending} className="min-h-12 bg-[#1E5B47] px-6">{pending ? "Uploading…" : "Upload images"}</Button></div>
    </form>
  );
}
