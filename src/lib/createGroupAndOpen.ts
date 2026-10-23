import { useNavigate } from "@solidjs/router";
import { createGroup } from "./api/groups.ts";

/** For a page: creates a group with the given name, then opens its page. */
export function useCreateGroupAndOpen() {
  const navigate = useNavigate();
  return async (name: string) => {
    navigate(`/groups/${await createGroup(name)}`);
  };
}
