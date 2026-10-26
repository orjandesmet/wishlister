import { describe, expect, test } from "vite-plus/test";
import {
  allPictures,
  fitWithin,
  pictureLink,
  planPictures,
  savedPictures,
  type FormPicture,
} from "./itemPictures.ts";

const row = (id: string, position: number, path: string | null, url: string | null = null) => ({
  id,
  position,
  path,
  url,
});

describe("savedPictures", () => {
  test("orders by position and serves uploads from the public bucket", () => {
    expect(
      savedPictures(
        [row("b", 2, null, "https://shop.be/b.jpg"), row("a", 0, "p1/a.webp")],
        "https://x.supabase.co",
      ),
    ).toEqual([
      { id: "a", src: "https://x.supabase.co/storage/v1/object/public/item-pictures/p1/a.webp" },
      { id: "b", src: "https://shop.be/b.jpg" },
    ]);
  });
});

describe("allPictures", () => {
  test("own pictures first, then the link's", () => {
    expect(allPictures([{ id: "a", src: "own" }], "link")).toEqual(["own", "link"]);
  });
  test("the link's picture once, also when added as an own picture", () => {
    expect(allPictures([{ id: "a", src: "link" }], "link")).toEqual(["link"]);
    expect(allPictures([], null)).toEqual([]);
  });
});

describe("planPictures", () => {
  const file = (key: string): FormPicture => ({ kind: "file", key, file: new Blob(), src: key });
  test("deletes what's gone and adds new ones after the kept ones", () => {
    const saved = [row("a", 0, "p/a"), row("b", 3, "p/b"), row("c", 4, "p/c")];
    const form: FormPicture[] = [
      { kind: "saved", id: "b", src: "b" },
      file("new"),
      { kind: "url", key: "u", src: "https://x.be/u.png" },
    ];
    const plan = planPictures(saved, form);
    expect(plan.remove).toEqual(["a", "c"]);
    expect(plan.add.map((a) => a.position)).toEqual([4, 5]);
    expect(plan.add[0].picture).toBe(form[1]);
  });
  test("a new item starts at 0", () => {
    expect(planPictures([], [file("x")]).add[0].position).toBe(0);
  });
});

describe("fitWithin", () => {
  test("shrinks the longest side, keeping proportions", () => {
    expect(fitWithin(4032, 3024, 1200)).toEqual({ width: 1200, height: 900 });
    expect(fitWithin(1000, 3000, 1200)).toEqual({ width: 400, height: 1200 });
  });
  test("never enlarges", () => {
    expect(fitWithin(300, 200, 1200)).toEqual({ width: 300, height: 200 });
  });
});

describe("pictureLink", () => {
  test("only full http(s) links", () => {
    expect(pictureLink(" https://x.be/a.jpg ")).toBe("https://x.be/a.jpg");
    expect(pictureLink("x.be/a.jpg")).toBeNull();
    expect(pictureLink("javascript:alert(1)")).toBeNull();
  });
});
