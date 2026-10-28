declare const brand: unique symbol;

/**
 * A string that TypeScript treats as its own type, so one kind of id can't be passed
 * where another is expected. The brand only exists for the type checker: at runtime the
 * value is the plain UUID string Supabase returns.
 */
type Brand<T, B extends string> = T & { readonly [brand]: B };

/** auth.users.id, from the Supabase session. */
export type AccountId = Brand<string, "AccountId">;
/** profiles.id. Everyone has a profile; children have one without an account. */
export type ProfileId = Brand<string, "ProfileId">;
/** groups.id */
export type GroupId = Brand<string, "GroupId">;
/** items.id */
export type ItemId = Brand<string, "ItemId">;
/** occasions.id */
export type OccasionId = Brand<string, "OccasionId">;
/** item_questions.id */
export type QuestionId = Brand<string, "QuestionId">;
/** secret_santas.id: the draw for one occasion. */
export type SecretSantaId = Brand<string, "SecretSantaId">;
