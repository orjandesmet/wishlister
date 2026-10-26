import {
  createContext,
  createEffect,
  createResource,
  Show,
  useContext,
  type ParentComponent,
  type Resource,
} from "solid-js";
import { getManagedProfiles, getMyProfile, type MyProfile, type Profile } from "./api/profiles.ts";
import { useAuth } from "./auth.tsx";
import { t } from "./i18n.ts";
import { isReady } from "./resource.ts";
import { setSeasonalThemes } from "./theme.ts";
import type { AccountId } from "./ids.ts";
import u from "../utilities.module.css";

type Me = {
  profile: MyProfile;
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

  // The seasonal themes follow the account's choice once it's known.
  createEffect(() => {
    const loaded = profile();
    if (loaded) setSeasonalThemes(loaded.seasonal_themes);
  });

  // Wait for the children too, or "My list" turns into "My lists" (and similar) once they arrive.
  const ready = () => (isReady(managed) || managed.error ? profile() : undefined);

  return (
    <Show
      when={ready()}
      fallback={
        <p class={`${u.center} ${u.muted}`}>
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
