import type { GroupSelection } from "./api/items.ts";

/** What was typed into quick add, handed to the full item form (as router state) to carry on. */
export type ItemDraft = {
  /** The raw line: it may start with "!" or hold a link, which the form splits out. */
  text: string;
  groups: GroupSelection;
};
