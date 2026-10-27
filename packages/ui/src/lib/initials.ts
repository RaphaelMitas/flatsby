export const initials = (name: string, letters = 2) =>
  Array.from(name).slice(0, letters).join("").toUpperCase();
