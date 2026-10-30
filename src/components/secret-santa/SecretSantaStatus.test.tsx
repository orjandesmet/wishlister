import { MemoryRouter } from "@solidjs/router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { SecretSanta, SecretSantaCandidate } from "../../lib/api/secretSanta.ts";
import { t } from "../../lib/i18n.ts";
import type { OccasionId, ProfileId, SecretSantaId } from "../../lib/ids.ts";
import { SecretSantaStatus, type SecretSantaStatusProps } from "./SecretSantaStatus.tsx";

const person = (id: string, name: string): SecretSantaCandidate => ({
  profile_id: id as ProfileId,
  display_name: name,
});
const ann = person("ann", "Ann");
const bo = person("bo", "Bo");
const cleo = person("cleo", "Cleo");
const drew: SecretSanta = {
  id: "draw-1" as SecretSantaId,
  occasion_id: "xmas" as OccasionId,
  taking_part: true,
  recipient_profile_id: "bo" as ProfileId,
  recipient_name: "Bo",
};

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

function mount(overrides: Partial<SecretSantaStatusProps> = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  hosts.push(host);
  const props: SecretSantaStatusProps = {
    draw: drew,
    isManager: false,
    participants: [],
    onRemove: () => {},
    ...overrides,
  };
  render(() => <MemoryRouter root={() => <SecretSantaStatus {...props} />} />, host);
  return host;
}

describe("SecretSantaStatus", () => {
  it("says who you drew, with a link to their list", () => {
    const host = mount();
    expect(host.textContent).toContain(t("secretSanta.running"));
    const link = host.querySelector("a")!;
    expect(link.textContent).toBe("Bo");
    expect(link.getAttribute("href")).toBe("/lists/bo");
  });

  it("says when you don't take part, without any pair", () => {
    const host = mount({
      draw: { ...drew, taking_part: false, recipient_profile_id: null, recipient_name: null },
    });
    expect(host.textContent).toContain(t("secretSanta.notTakingPart"));
    expect(host.querySelector("a")).toBeNull();
  });

  it("never shows participants or remove buttons to members", () => {
    const host = mount({ participants: [ann, bo, cleo] });
    expect(host.textContent).not.toContain(t("secretSanta.participantsHelp"));
    expect(host.textContent).not.toContain("Ann");
    expect(host.querySelector("button")).toBeNull();
  });

  it("lists who takes part for managers, with a heading that counts them", () => {
    const host = mount({ isManager: true, participants: [ann, bo, cleo] });
    expect(host.querySelector("h2")?.textContent).toBe(t("secretSanta.participants", { count: 3 }));
    expect(
      [...host.querySelectorAll("li")].map((li) => li.querySelector("span")?.textContent),
    ).toEqual(["Ann", "Bo", "Cleo"]);
  });

  it("removes a person, naming them for screen readers", () => {
    const onRemove = vi.fn();
    const host = mount({ isManager: true, participants: [ann, bo, cleo], onRemove });
    const remove = [...host.querySelectorAll("button")].find((b) =>
      /Cleo/.test(b.textContent ?? ""),
    )!;
    expect(remove.textContent).toContain(t("common.remove"));
    remove.click();
    expect(onRemove).toHaveBeenCalledWith(drew, cleo);
  });
});
