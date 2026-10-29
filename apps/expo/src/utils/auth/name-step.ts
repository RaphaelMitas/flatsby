import { asksForName } from "@flatsby/validators/user";

// Module state, so keeping the suggested name doesn't send the user back while the account is still fresh
let finished = false;

export const finishNameStep = () => {
  finished = true;
};

export const nameStepPending = (signedIn: Parameters<typeof asksForName>[0]) =>
  !finished && asksForName(signedIn);
