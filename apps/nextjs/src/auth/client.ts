import { createAuthClient } from "better-auth/react";

type AuthClient = ReturnType<typeof createAuthClient>;

export const authClient: AuthClient = createAuthClient();

export const signIn: AuthClient["signIn"] = authClient.signIn;
export const signOut: AuthClient["signOut"] = authClient.signOut;
export const useSession: AuthClient["useSession"] = authClient.useSession;
