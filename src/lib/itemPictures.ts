/** Most own pictures an item can have (the database holds to it too). */
export const MAX_PICTURES = 5;

/** The Storage bucket uploads go to: public, one folder per list (see the migration). */
export const PICTURE_BUCKET = "item-pictures";

/** A picture row as the database has it: an upload (path) or a link (url). */
export type PictureRow = { id: string; path: string | null; url: string | null; position: number };

/** A saved picture, ready to show. */
export type SavedPicture = { id: string; src: string };

/**
 * The item's own pictures in order, with the address to show each by. Uploads are
 * served from the bucket's public address.
 */
export function savedPictures(rows: PictureRow[], storageUrl: string): SavedPicture[] {
  return rows
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((row) => ({
      id: row.id,
      src: row.path
        ? `${storageUrl}/storage/v1/object/public/${PICTURE_BUCKET}/${row.path}`
        : row.url!,
    }));
}

/**
 * Every picture of an item, the way the list shows them: its own first, then the
 * linked page's picture. The first one is the thumbnail.
 */
export function allPictures(own: SavedPicture[], linkPicture: string | null): string[] {
  const srcs = own.map((picture) => picture.src);
  return linkPicture && !srcs.includes(linkPicture) ? [...srcs, linkPicture] : srcs;
}

/** A picture in the item form: saved already, chosen from the phone, or a link typed in. */
export type FormPicture =
  | { kind: "saved"; id: string; src: string }
  | { kind: "file"; key: string; file: Blob; src: string }
  | { kind: "url"; key: string; src: string };

/** What saving the form changes: rows to delete, and new pictures after the kept ones. */
export function planPictures(saved: PictureRow[], form: FormPicture[]) {
  const kept = new Set(form.flatMap((p) => (p.kind === "saved" ? [p.id] : [])));
  const remove = saved.filter((row) => !kept.has(row.id)).map((row) => row.id);
  const keptRows = saved.filter((row) => kept.has(row.id));
  const after = Math.max(-1, ...keptRows.map((row) => row.position));
  const add = form
    .filter((p) => p.kind !== "saved")
    .map((picture, index) => ({ picture, position: after + 1 + index }));
  return { remove, add };
}

/**
 * The size to shrink a picture to: its longest side at most `max` pixels, the
 * proportions kept. Smaller pictures stay as they are.
 */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** A picture link worth saving: a full http(s) address. Null otherwise. */
export function pictureLink(text: string): string | null {
  try {
    const url = new URL(text.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** All pictures of a loaded item, in the order the list shows them. */
export function itemPictureSources(item: {
  item_pictures?: PictureRow[];
  image_url: string | null;
}): string[] {
  const own = savedPictures(item.item_pictures ?? [], import.meta.env.VITE_SUPABASE_URL ?? "");
  return allPictures(own, item.image_url);
}
