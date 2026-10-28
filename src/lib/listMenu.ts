import type { Group } from "./api/groups.ts";
import type { ProfileId } from "./ids.ts";

export type ListMenuOption = {
  id: ProfileId;
  /** What the menu says, like "My list" or just the person's name. */
  name: string;
  /** Whose initial the tile shows. */
  person: string;
  /** You drew this person in a Secret Santa that hasn't ended. */
  ribbon?: boolean;
};

/** A block of the list menu. Only the group blocks have a title. */
export type ListMenuSection = { title?: string; options: ListMenuOption[] };

/**
 * The list menu: your own list and your children's on top, then one section per group
 * with the other members whose list that group shows. Guardians are left out of a group,
 * since their own list isn't shown there, and someone in several groups appears in each.
 * People you drew in a Secret Santa (`drawn`) get a ribbon.
 */
export function listMenuSections(
  own: ListMenuOption[],
  groups: Group[],
  compare: (a: string, b: string) => number,
  drawn: ProfileId[] = [],
): ListMenuSection[] {
  const ownIds = new Set(own.map((option) => option.id));
  const groupSections = groups.flatMap((group) => {
    const options = group.group_members
      .filter((m) => m.role !== "guardian" && !ownIds.has(m.profile_id))
      .map((m) => ({
        id: m.profile_id,
        name: m.profiles.display_name,
        person: m.profiles.display_name,
        ribbon: drawn.includes(m.profile_id),
      }))
      .sort((a, b) => compare(a.name, b.name));
    return options.length ? [{ title: group.name, options }] : [];
  });
  return [{ options: own }, ...groupSections];
}
