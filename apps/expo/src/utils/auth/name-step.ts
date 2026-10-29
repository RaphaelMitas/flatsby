// Module state, not a route param: the root layout leaves the code screen on its own once the session lands
let pending = false;

export const askForName = () => {
  pending = true;
};

export const nameStepPending = () => pending;

export const finishNameStep = () => {
  pending = false;
};
