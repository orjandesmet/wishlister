import { fitWithin } from "./itemPictures.ts";

/** Longest side of an uploaded picture: sharp enough for the bigger view on a phone. */
const MAX_SIDE = 1200;
const QUALITY = 0.8;

/**
 * Shrinks a picture from the phone or computer before it's uploaded: at most 1200
 * pixels on its longest side, as WebP (or JPEG where the browser can't make WebP,
 * like Safari). A photo of a few MB ends up around 100-200 KB, which keeps the free
 * Storage plan (1 GB) far away. Turned the right way up, and without the photo's
 * metadata (like where it was taken).
 */
export async function shrinkPicture(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const size = fitWithin(bitmap.width, bitmap.height, MAX_SIDE);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d")!;
    // Transparent parts (a PNG) would turn black in a JPEG.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    const webp = await toBlob(canvas, "image/webp");
    // Browsers that can't make WebP quietly hand back a PNG instead.
    if (webp?.type === "image/webp") return webp;
    const jpeg = await toBlob(canvas, "image/jpeg");
    if (!jpeg) throw new Error("Couldn't read this picture.");
    return jpeg;
  } finally {
    bitmap.close();
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
}
