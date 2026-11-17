const strings = {
  en: {
    group: "Sunset Villa",
    itemsLeft: "4 items left",
    apples: "Apples",
    oatMilk: "Oat Milk",
    paperTowels: "Paper Towels",
    weeklyShopping: "Weekly shopping",
    internetBill: "Internet bill",
    cleaningSupplies: "Cleaning supplies",
    bins: "Take out bins",
    bathroom: "Clean bathroom",
    description: "Ski trip fund",
    tabHome: "Home",
    tabShopping: "Shopping",
    tabExpenses: "Expenses",
    tabCalendar: "Calendar",
  },
  de: {
    group: "WG Sonnenblick",
    itemsLeft: "4 Artikel offen",
    apples: "Äpfel",
    oatMilk: "Hafermilch",
    paperTowels: "Küchenrolle",
    weeklyShopping: "Wocheneinkauf",
    internetBill: "Internetrechnung",
    cleaningSupplies: "Putzmittel",
    bins: "Müll rausbringen",
    bathroom: "Bad putzen",
    description: "Skiurlaub",
    tabHome: "Start",
    tabShopping: "Einkaufen",
    tabExpenses: "Ausgaben",
    tabCalendar: "Kalender",
  },
};

output.locale = typeof E2E_LOCALE === "undefined" ? "en" : E2E_LOCALE;
output.store = strings[output.locale];
