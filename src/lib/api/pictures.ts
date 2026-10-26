import { supabase } from "../supabase.ts";
import type { ItemId, ProfileId } from "../ids.ts";
import {
  PICTURE_BUCKET,
  planPictures,
  type FormPicture,
  type PictureRow,
} from "../itemPictures.ts";
import { shrinkPicture } from "../shrinkPicture.ts";
import { must } from "./must.ts";

/** A new picture after its upload: where it ended up. */
export type ReadyPicture = { path: string } | { url: string };

/**
 * Shrinks and uploads the pictures chosen in the item form, into the list's folder.
 * Links typed in need nothing yet. `progress` hears which upload starts (from 1).
 * Done before the item is saved, so a failed upload doesn't leave half an item;
 * uploads whose item then fails to save are cleaned up the next day.
 */
export async function uploadPictures(
  profileId: ProfileId,
  pictures: FormPicture[],
  progress: (number: number, of: number) => void,
): Promise<Map<FormPicture, ReadyPicture>> {
  const ready = new Map<FormPicture, ReadyPicture>();
  const files = pictures.filter((p) => p.kind === "file");
  for (const [index, picture] of files.entries()) {
    progress(index + 1, files.length);
    const blob = await shrinkPicture(picture.file);
    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    const path = `${profileId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from(PICTURE_BUCKET)
      .upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
    if (error) throw new Error(error.message);
    ready.set(picture, { path });
  }
  for (const picture of pictures) {
    if (picture.kind === "url") ready.set(picture, { url: picture.src });
  }
  return ready;
}

/**
 * Makes the item's pictures what the form shows: the removed ones go, the new ones
 * (uploaded already, see uploadPictures) come after the kept ones. The files of
 * removed uploads are deleted by the daily cleanup.
 */
export async function savePictures(
  itemId: ItemId,
  saved: PictureRow[],
  form: FormPicture[],
  ready: Map<FormPicture, ReadyPicture>,
) {
  const { remove, add } = planPictures(saved, form);
  if (remove.length > 0) must(await supabase.from("item_pictures").delete().in("id", remove));
  if (add.length === 0) return;
  must(
    await supabase.from("item_pictures").insert(
      add.map(({ picture, position }) => ({
        item_id: itemId,
        position,
        path: null,
        url: null,
        ...ready.get(picture),
      })),
    ),
  );
}
