import {
  createContext,
  createResource,
  Show,
  useContext,
  type ParentComponent,
  type Resource,
} from "solid-js";
import { getManagedProfiles, getMyProfile, type Profile } from "./api.ts";
import { useAuth } from "./auth.tsx";

type Me = {
  accountId: string;
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
  const accountId = () => session()?.user.id;
  const [profile, { refetch: refetchProfile }] = createResource(accountId, getMyProfile);
  const [managed, { refetch: refetchManaged }] = createResource(accountId, getManagedProfiles);

  return (
    <Show
      when={profile()}
      fallback={
        <p class="center muted">
          {profile.error ? `Couldn't load your profile: ${profile.error.message}` : "Loading…"}
        </p>
      }
    >
      {(loaded) => (
        <MeContext.Provider
          value={() => ({
            accountId: loaded().account_id!,
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
