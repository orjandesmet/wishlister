import {
  createContext,
  createResource,
  Show,
  useContext,
  type ParentComponent,
  type Resource,
} from "solid-js";
import { getManagedProfiles, getMyProfile, type Profile } from "./api/profiles.ts";
import { useAuth } from "./auth.tsx";
import { t } from "./i18n.ts";
import { isReady } from "./resource.ts";
import type { AccountId } from "./ids.ts";

type Me = {
  profile: Profile;
  /** Children whose lists I manage. */
  managed: Resource<Profile[]>;
  refetchProfile: () => void;
  refetchManaged: () => void;
};

const MeContext = createContext<() => Me>();

/** Loads the signed-in person's profile once and shares it with every page below. */
export const MeProvider: ParentComponent = (props) => {
  const { session } = useAuth();
  const accountId = () => session()?.user.id as AccountId | undefined;
  const [profile, { refetch: refetchProfile }] = createResource(accountId, getMyProfile);
  const [managed, { refetch: refetchManaged }] = createResource(
    () => profile()?.id,
    getManagedProfiles,
  );

  // Wait for the children too, or "My list" turns into "My lists" (and similar) once they arrive.
  const ready = () => (isReady(managed) || managed.error ? profile() : undefined);

  return (
    <Show
      when={ready()}
      fallback={
        <p class="center muted">
          {profile.error
            ? t("me.loadFailed", { message: profile.error.message })
            : t("common.loading")}
        </p>
      }
    >
      {(loaded) => (
        <MeContext.Provider
          value={() => ({
            profile: loaded(),
            managed,
            refetchProfile: () => void refetchProfile(),
            refetchManaged: () => void refetchManaged(),
          })}
        >
          {props.children}
        </MeContext.Provider>
      )}
    </Show>
  );
};

export function useMe(): () => Me {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe must be used inside <MeProvider>");
  return me;
}
