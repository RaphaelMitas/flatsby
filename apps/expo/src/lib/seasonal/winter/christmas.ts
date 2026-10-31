// The hat, fairy lights and wreath go away after Boxing Day; the snow stays.
export function isChristmas() {
  const date = new Date();
  const month = date.getMonth();
  return month === 10 || (month === 11 && date.getDate() <= 26);
}
