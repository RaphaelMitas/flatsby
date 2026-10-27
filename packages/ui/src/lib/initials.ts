const graphemes = new Intl.Segmenter();

export const initials = (name: string, letters = 2) =>
  Array.from(graphemes.segment(name), ({ segment }) => segment)
    .slice(0, letters)
    .join("")
    .toUpperCase();
