import { describe, expect, test } from "vite-plus/test";
import { easterSunday, readThemePreview, themeOn } from "./theme.ts";

describe("themeOn", () => {
  test("Sinterklaas from 1 to 6 December", () => {
    expect(themeOn("2026-11-30")).toBeUndefined();
    expect(themeOn("2026-12-01")).toBe("sinterklaas");
    expect(themeOn("2026-12-06")).toBe("sinterklaas");
  });

  test("Christmas from 7 to 25 December", () => {
    expect(themeOn("2026-12-06")).not.toBe("christmas");
    expect(themeOn("2026-12-07")).toBe("christmas");
    expect(themeOn("2026-12-25")).toBe("christmas");
  });

  test("New Year from 26 December to 7 January", () => {
    expect(themeOn("2026-12-26")).toBe("newYear");
    expect(themeOn("2027-01-01")).toBe("newYear");
    expect(themeOn("2027-01-07")).toBe("newYear");
    expect(themeOn("2027-01-08")).toBeUndefined();
  });

  test("birthday only on 1 March", () => {
    expect(themeOn("2027-02-28")).toBeUndefined();
    expect(themeOn("2027-03-01")).toBe("birthday");
    expect(themeOn("2027-03-02")).toBeUndefined();
  });

  test("Halloween from 28 to 31 October", () => {
    expect(themeOn("2026-10-27")).toBeUndefined();
    expect(themeOn("2026-10-28")).toBe("halloween");
    expect(themeOn("2026-10-31")).toBe("halloween");
    expect(themeOn("2026-11-01")).toBeUndefined();
  });

  test("Easter from Good Friday to Easter Monday", () => {
    // Easter 2027 is on 28 March.
    expect(themeOn("2027-03-25")).toBeUndefined();
    expect(themeOn("2027-03-26")).toBe("easter");
    expect(themeOn("2027-03-28")).toBe("easter");
    expect(themeOn("2027-03-29")).toBe("easter");
    expect(themeOn("2027-03-30")).toBeUndefined();
  });

  test("an ordinary day has none", () => {
    expect(themeOn("2026-07-14")).toBeUndefined();
  });
});

test("easterSunday", () => {
  expect(easterSunday(2026)).toBe("2026-04-05");
  expect(easterSunday(2027)).toBe("2027-03-28");
  expect(easterSunday(2028)).toBe("2028-04-16");
  expect(easterSunday(2038)).toBe("2038-04-25");
  expect(easterSunday(2285)).toBe("2285-03-22");
});

describe("readThemePreview", () => {
  const url = (query: string) => new URL(`http://localhost:5173/${query}`);

  test("only where previews are allowed", () => {
    sessionStorage.clear();
    expect(readThemePreview(url("?theme=halloween"), false)).toEqual({});
  });

  test("reads ?theme= and ?date=, and keeps them for the tab", () => {
    sessionStorage.clear();
    expect(readThemePreview(url("?theme=halloween"), true)).toEqual({ theme: "halloween" });
    expect(readThemePreview(url("?date=2026-12-24"), true)).toEqual({
      theme: "halloween",
      date: "2026-12-24",
    });
    expect(readThemePreview(url(""), true)).toEqual({ theme: "halloween", date: "2026-12-24" });
  });

  test("an empty ?theme= clears it, an unknown one is ignored", () => {
    sessionStorage.clear();
    readThemePreview(url("?theme=easter&date=2026-12-24"), true);
    expect(readThemePreview(url("?theme="), true)).toEqual({});
    expect(readThemePreview(url("?theme=valentine"), true)).toEqual({});
  });
});
