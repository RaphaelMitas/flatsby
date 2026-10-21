// What the store-screenshot flows wait on and crop, per E2E_LOCALE: the
// seeded content (create-session's STORE_COPY) and the app's own labels.
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
    amountHeading: "Amount & Details",
    step1: "Step 1 of 3",
    step2: "Step 2 of 3",
    dayProgress: "1 of 3 done.*",
    spent: "€142.69",
    tabHome: "Home",
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
    amountHeading: "Betrag & Details",
    step1: "Schritt 1 von 3",
    step2: "Schritt 2 von 3",
    dayProgress: "1 von 3 erledigt.*",
    // Intl puts a no-break space before the euro sign.
    spent: "142,69.€",
    tabHome: "Start",
    tabExpenses: "Ausgaben",
    tabCalendar: "Kalender",
  },
};

output.locale = typeof E2E_LOCALE === "undefined" ? "en" : E2E_LOCALE;
output.store = strings[output.locale];
