export const marketing = {
  title: "Flatshare app: chores, shopping list & bills | Flatsby",
  description:
    "Free app for flatmates, without ads: a chore rota where you take turns, shared shopping lists and bills split fairly, rent included. iPhone, Android and web.",
  headline: "The flatshare app for chores, shopping lists and splitting bills",
  freeOn: "Free on web, iPhone and Android",
  subheadline:
    "Whose turn is the bathroom, what's missing from the fridge, who owes whom? Flatsby answers that for your flatshare or for the two of you. Free, without ads, on iPhone, Android and the web.",
  ogImageAlt: "Flatsby: chore rota, shopping lists and bill splitting",
  nav: {
    shoppingLists: "Shopping lists",
    calendar: "Chore rota",
    expenses: "Expenses",
    expenseSplitting: "Expense splitting",
    aiAssistant: "AI assistant",
    splitwiseAlternative: "Splitwise alternative",
    flatasticAlternative: "Flatastic alternative",
    pricing: "Pricing",
    faq: "FAQ",
    signIn: "Sign In",
    getStarted: "Get Started",
    product: "Product",
    getTheApp: "Get the app",
    webApp: "Web app",
    appStore: "App Store",
    googlePlay: "Google Play",
    sourceCode: "Source code",
    legal: "Legal",
    terms: "Terms",
    privacy: "Privacy",
    legalNotice: "Legal notice",
    language: "Language",
  },
  hero: {
    openInBrowser: "Open in Browser",
    appStore: "Download on the App Store",
    googlePlay: "Get it on Google Play",
  },
  features: {
    heading: "Everything you need to run your household",
    examples: "The lists, expenses and chat below are examples.",
    calendar: {
      title: "Chore rota and calendar",
      body: "Set up chores like cleaning the bathroom or taking out the bins once, and pick who takes turns in which order. Everyone sees when it's their turn, weeks ahead, and the history shows who did what. Events like the house meeting go in the same calendar.",
      link: "Chore rota app for flatshares",
    },
    lists: {
      title: "Shared shopping lists",
      body: "As many lists as you need, sorted by category like the shop. You pick the category yourself, or Flatsby suggests one with AI credits, part of which are free every month. Whoever shops ticks items off. The others see new items once the list reloads: when they open the app or pull the list down.",
    },
    expenses: {
      title: "Expense splitting",
      body: "Log what you paid and split it equally, by percentage, by shares or by exact amounts, such as rent by room size or by income. No daily limit on expenses. Flatsby shows who owes whom and works out the fewest payments that settle everyone up. Coming from Splitwise, a CSV import brings your history along.",
    },
    assistant: {
      title: "Extra: AI assistant on the web",
      body: "Ask in plain language, for example how much you spent on groceries last month. It answers with charts and tables, can add items or expenses for you, asks for your consent first and is optional.",
    },
    groups: {
      title: "One household, every device",
      body: "Whoever creates the household invites the others with a link, QR code or code. iPhone, Android and browser share the same account and data. You sign in with Google or Apple.",
    },
  },
  steps: {
    heading: "Get started in 3 simple steps",
    signIn: {
      title: "Sign in",
      body: "Use your Google or Apple account on the web or in the iPhone or Android app.",
    },
    createGroup: {
      title: "Create your household",
      body: "Make a group for your home. You become its admin.",
    },
    addFlatmates: {
      title: "Invite flatmates",
      body: "Send them a link, show them a QR code or read out the code. They join with one tap.",
    },
  },
  sections: {
    splitwise: {
      title: "Switching from Splitwise",
      body: "Flatsby imports a Splitwise CSV export, so your history comes with you. In Splitwise, export the group as CSV. In Flatsby, open Group settings, Import expenses, pick the currency, match the Splitwise names to your flatmates and upload the file. The preview lists any rows it skips, such as other currencies or expenses with several payers, before anything is imported.",
    },
    about: {
      title: "Who makes Flatsby",
      body: "Flatsby is built by Raphael Mitas, an independent developer in Darmstadt, Germany. The code is open source on GitHub, and releases ship to the web, the App Store and Google Play from the same repository.",
    },
  },
  facts: {
    heading: "Flatsby at a glance",
    whatItIs: {
      label: "What it is",
      value:
        "An app for people who live together: a chore rota with a calendar, shared shopping lists, shared expenses and settling up.",
    },
    audience: {
      label: "Who it is for",
      value: "Flatmates or roommates, couples and families who share a home.",
    },
    platforms: {
      label: "Platforms",
      value:
        "iPhone, Android and the web at flatsby.com, in English and German. Same account and data everywhere.",
    },
    price: {
      label: "Price",
      value:
        "Free, without ads and without a member limit. Picking categories yourself is free. You only pay for extra AI credits, which the AI assistant and automatic categories use. A monthly allowance is free.",
    },
    signIn: { label: "Sign in", value: "Google or Apple account." },
    splitting: {
      label: "Splitting",
      value:
        "Equal, percentage, shares or exact amounts. EUR, USD, GBP and CHF.",
    },
    switching: { label: "Switching", value: "Imports a Splitwise CSV export." },
    limits: {
      label: "Limits",
      value:
        "No push reminders. No recurring expenses. Not live: other people's changes show up when the app reloads, so when you open it, come back to it or pull down.",
    },
    data: {
      label: "Your data",
      value:
        "Database and servers in Frankfurt, with cloud providers in their EU region, and usage analytics without ad tracking. The AI assistant only sends data to OpenAI or Google after you consent. For automatic categories, only the name of a new item or expense goes to an AI model, and if you pick the category yourself, nothing is sent. A receipt you scan goes to OpenAI as a photo and isn't stored. Export everything or delete your account in settings at any time, details in the privacy policy.",
    },
    source: {
      label: "Source code",
      value: "Open source, MIT license. No public API for other apps.",
    },
  },
  faq: {
    heading: "Questions",
    allQuestions: "All questions",
    free: {
      question: "Is Flatsby really free and ad-free?",
      answer:
        "Yes. The chore rota, shopping lists, expenses, settlements and groups are free, without ads and with no member limit. Flatsby only makes money from optional AI credits. The AI assistant and automatic categories use credits: {freeCredits, number} a month for free, {starterCredits, number} on Starter ({starterPrice, number, ::currency/USD} a month) and {proCredits, number} on Pro ({proPrice, number, ::currency/USD} a month on the web). On iPhone, Pro is {proAppStorePrice, number, ::currency/USD} a month in the US App Store.",
    },
    android: {
      question: "Does Flatsby work on Android?",
      answer:
        "Yes. Flatsby is in the Google Play Store, the App Store and on the web at flatsby.com. It is the same account and the same data on every device.",
    },
    splitwise: {
      question: "Can I move my expenses over from Splitwise?",
      answer:
        "Yes. Export your group from Splitwise as CSV, then upload it under Group settings, Import expenses. You pick the currency and match Splitwise names to your flatmates. Each expense keeps the exact amount every person owed, so percentage splits arrive as amounts. Rows in other currencies or with several payers are skipped, and the preview lists them first. There is no import from Tricount.",
    },
    split: {
      question: "How does Flatsby split an expense?",
      answer:
        "Equally, by percentage, by shares (for example 2 parts to 1), or by exact amounts per person. Expenses can be in EUR, USD, GBP or CHF, and Flatsby keeps a running balance per person for each currency.",
    },
    rent: {
      question: "Can I set up rent as a recurring expense?",
      answer:
        "Not yet. Add rent as a new expense each month. Each expense keeps its own split, so a 60/40 rent split and a 50/50 grocery split can sit in the same balance.",
    },
    members: {
      question: "How many people can be in a household?",
      answer:
        "There is no member limit. A group admin invites each flatmate with a link, QR code or short code.",
    },
    web: {
      question: "Is the web app the same as the phone apps?",
      answer:
        "Almost. Lists, expenses, settlements and group settings work on the web, iPhone and Android. The AI assistant is web only for now.",
    },
    realtime: {
      question: "Do shopping lists update in real time?",
      answer:
        "Not instantly. Everyone shares the same lists, and a flatmate's changes show up when you open the list again, come back to the app or tab, or pull the list down in the app.",
    },
    assistant: {
      question: "What does the AI assistant do?",
      answer:
        "In the web app, you ask about your household in plain language. It reads your lists and expenses, answers with charts and tables, and can add items or expenses for you.",
    },
    privacy: {
      question: "Who can see my household's data?",
      answer:
        "Inside Flatsby, only members of your group. The hosting, analytics and AI providers listed in the privacy policy process it to run the app. Three features send data through the Vercel AI Gateway. The AI assistant asks for consent first, uses OpenAI or Google models, and its data is not used to train them. Automatic categories send the names of shopping items and expenses to a classification model. Scanning a receipt sends its photo to an OpenAI model to read the amount, date and store, and Flatsby doesn't keep the photo. You can export all of your data or delete your account from your settings.",
    },
    chores: {
      question: "Can Flatsby run a chore rota?",
      answer:
        "Yes. In the calendar you add chores that repeat daily, weekly, monthly or yearly, and pick who takes turns in which order. Everyone sees when it's their turn, and the history shows who did what. Push reminders aren't available yet.",
    },
    flatastic: {
      question: "What is a good Flatastic alternative?",
      answer:
        "If you want a chore rota, a shopping list and bill splitting in one app, but without ads, Flatsby is a free alternative for iPhone, Android and the web. If you only want to split costs, Splitwise or Tricount will do, and for the shopping list alone, Bring!.",
    },
    openSource: {
      question: "Is Flatsby open source?",
      answer:
        "Yes. The code for the web app, the mobile apps and the server is on GitHub under the MIT license. There is no public API for other apps.",
    },
  },
  cta: {
    heading: "Ready to simplify your household?",
    note: "Free on web, iPhone and Android. Sign in with Google or Apple.",
    button: "Get Started Free",
  },
  contentPage: {
    updated: "Updated <time>{date}</time>",
    howItWorks: "How Flatsby works",
    more: "More about Flatsby",
  },
  screenshots: {
    webHome: "Flatsby home screen on the web",
    webLists: "A shared grocery list in the Flatsby web app",
    webExpenses: "List of shared expenses with who paid and how it was split",
    webChat: "The AI assistant answering a spending question with a chart",
    iosList: "A shared shopping list on iPhone",
    iosSplit: "Splitting an expense between flatmates on iPhone",
    iosCalendar:
      "The chore rota on iPhone: the week's chores and whose turn it is",
    webCalendar: "The household calendar on the web in month view",
  },
  table: {
    yes: "Yes",
    no: "No",
    none: "None",
    noLimit: "No limit",
    pro: "Pro",
    platforms: "Web, iPhone, Android",
  },
  plans: {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
    credits: "{credits, number}",
    perMonth: "{price, number, ::currency/USD} a month",
  },
  pages: {
    shoppingLists: {
      title: "Shared shopping list app for flatmates | Flatsby",
      description:
        "One shopping list for the whole flat on web, iPhone and Android, sorted by category, with who added each item. Free.",
      headline: "A shared shopping list the whole flat can use",
      intro:
        "Everyone in your household adds to the same lists from their own phone or browser. Whoever is in the shop ticks things off, and the item is gone for everyone else too.",
      howItWorks: {
        heading: "How it works",
        lists:
          "Create as many lists as your household needs, for example one for groceries and one for the hardware store. Anyone in the group can add, edit or tick off items.",
        categories:
          "Each item has a category such as produce, dairy or bakery, so the list sorts itself the way a shop is laid out. When you add an item, Flatsby can suggest the category by sending the item name to a classification model, and you can change it. This uses AI credits.",
      },
      devices: {
        heading: "The same list on every device",
        body: "The same lists open on the web, on iPhone and on Android. Changes are not pushed live yet: a flatmate's edits show up when you open the list again or come back to the app or tab.",
      },
      limits: {
        heading: "What it does not do",
        body: "There are no reminders or push notifications yet. Lists are for shopping. For chores, there's the chore rota in the calendar.",
      },
    },
    expenses: {
      title: "Split bills and expenses with flatmates | Flatsby",
      description:
        "Log shared costs, split them equally, by percentage, by shares or exact amounts, and see who owes whom. Settle up with fewer payments. Free.",
      headline: "Split bills with your flatmates without a spreadsheet",
      intro:
        "Log what you paid, choose how to split it, and Flatsby keeps a running balance for everyone in the household.",
      splits: {
        heading: "Four ways to split",
        equal: "Equally between everyone, or between the people you pick.",
        percentage: "By percentage, for example rent split 60/40 by room size.",
        shares:
          "By shares, for example 2 parts to 1 when one person uses twice as much.",
        exact: "By exact amounts, when each person owes a specific sum.",
        body: "Each expense keeps its own split, so a 60/40 rent payment and a 50/50 grocery run can sit side by side in the same balance.",
      },
      balances: {
        heading: "Balances and settling up",
        owes: "Flatsby shows what each person owes or is owed. It simplifies the debts, so the household needs fewer payments to get back to zero.",
        settlement:
          "When someone pays a flatmate back, record it as a settlement and both balances update.",
      },
      currencies: {
        heading: "Currencies and categories",
        currencies:
          "Expenses can be in EUR, USD, GBP or CHF. Flatsby does not convert between currencies. It keeps a separate balance per currency instead.",
        categories:
          "Every expense has a category, such as groceries, internet or home goods, so you can see where the money goes.",
      },
      recurring: {
        heading: "Rent and other recurring costs",
        body: "There are no recurring expenses yet. Add rent as a new expense each month.",
      },
    },
    aiAssistant: {
      title: "AI assistant for your household | Flatsby",
      description:
        "Ask about your shared lists and expenses in plain language on the web. Get charts and tables, or have it add items and expenses for you.",
      headline: "Ask your household anything",
      intro:
        "The assistant reads your group's shopping lists and expenses and answers in plain language, with charts and tables when numbers help. It is in the web app; the iPhone and Android apps don't have it yet.",
      questions: {
        heading: "What you can ask",
        groceries: "How much did we spend on groceries last month?",
        paidMost: "Who has paid the most this year?",
        addItems: "Add pasta, tomatoes and parmesan to the shopping list.",
        logExpense: "Log 45 euros for groceries, paid by me, split equally.",
      },
      data: {
        heading: "Your data and the AI providers",
        consent:
          "The assistant asks for your consent before it sends anything. Your messages, and the list items, expenses and member names a question needs, go to OpenAI or Google through the Vercel AI Gateway to generate the answer.",
        categories:
          "Automatic categories are separate from the assistant: when you add a shopping item or an expense, its name goes through the same gateway to a classification model so Flatsby can suggest a category. Scanning a receipt sends the photo through the same gateway to OpenAI to read it; Flatsby doesn't store it.",
        training:
          "Your email address and sign-in details are not sent to the AI providers. Data sent for the assistant is used to generate the answer, not to train models. AI usage numbers such as the model and token counts, without your messages, go to PostHog for analytics.",
      },
      credits: {
        heading: "Credits",
        body: "The assistant and automatic categories use credits: {freeCredits, number} a month on the free plan, more on Starter and Pro. When credits run out, new items get the category Other until the next month. Lists, expenses and settling up never need credits.",
      },
    },
    splitwise: {
      title: "Splitwise alternative for flatmates | Flatsby",
      description:
        "Flatsby vs Splitwise: no daily expense limit, no ads, a shared shopping list built in, and a Splitwise CSV import. Plus where Splitwise is better.",
      headline: "A Splitwise alternative built for shared flats",
      intro:
        "Splitwise is the default for splitting bills, and it is good at it. Flatsby is for households that also want a shared shopping list and don't want a daily limit on adding expenses.",
      table: {
        caption:
          "Flatsby and Splitwise compared. Splitwise details are from splitwise.com/pro, checked October 2026.",
        lists: "Shared shopping lists",
        listsFlatsby: "Yes, on every device",
        limit: "Limit on new expenses per day (free)",
        limitSplitwise: "Yes, Pro removes it",
        ads: "Ads (free)",
        adsSplitwise: "Yes, Pro is ad-free",
        split: "Split equally, by percentage, by shares or exact amounts",
        simplify: "Debt simplification",
        currency: "Currency conversion",
        currencyFlatsby: "No, balances per currency",
        receipts: "Receipt scanning",
        charts: "Spending charts",
        chartsFlatsby: "Through the AI assistant (uses credits)",
        outside: "Expenses outside a group",
        platforms: "Platforms",
        openSource: "Open source",
        openSourceFlatsby: "Yes, MIT license",
      },
      better: {
        heading: "Where Splitwise is better",
        body: "Splitwise Pro converts currencies, scans receipts and itemizes them, and in the US imports card transactions. Splitwise also handles one-off expenses with a friend outside any group. It has been around for years and most people already have an account. If those matter more to you than a shared shopping list, stay with Splitwise.",
      },
      moving: {
        heading: "Moving from Splitwise to Flatsby",
        export:
          "In Splitwise on the web, open the group and export it as a spreadsheet (CSV).",
        group:
          "In Flatsby, create your household group and add your flatmates.",
        upload:
          "Open Group settings, choose Import expenses, pick the currency and upload the CSV.",
        match: "Match each Splitwise name to a flatmate.",
        preview:
          "Check the preview. It lists rows it will skip, such as other currencies, expenses with several payers, or splits that don't add up.",
        import:
          "Import. Each expense keeps the exact amount every person owed, so percentage splits arrive as amounts, not percentages.",
      },
    },
    calendar: {
      title: "Chore rota app for flatshares: free, whose turn? | Flatsby",
      description:
        "A flatshare chore rota as an app: chores rotate automatically, everyone sees when it's their turn, and the history shows who did what. Free, without ads.",
      headline: "The flatshare chore rota where it's clear whose turn it is",
      intro:
        "No more “Whose turn was the bathroom again?” In Flatsby you set up your chores once, pick who takes turns, and everyone sees in the app when it's their turn. Free, without ads, on iPhone, Android and the web.",
      setup: {
        heading: "Quick to set up",
        invite:
          "Create your household and invite flatmates with a link, QR code or code.",
        tasks:
          "Add chores: bathroom, kitchen, bins, hallway, whatever comes up.",
        rotation:
          "For each chore, pick how often it's due (every few days, on set weekdays, monthly or yearly) and who takes turns in which order. Or leave it open, so anyone can do it.",
      },
      mine: {
        heading: "What's on me?",
        body: "The week view shows what's due today and in the next few days, and a filter shows only your chores. The app's home page shows what's on you today. Because the order is fixed, you know weeks ahead when it's your turn, handy for shift work or holidays.",
      },
      fair: {
        heading: "Fair, because you can see it",
        body: "Each chore's history shows who did it and when. Missed dates stay visible as overdue, with a count of how often they were missed, instead of quietly disappearing. If a date doesn't apply, say because everyone is away, you skip it.",
      },
      template: {
        heading: "Printable template or app?",
        body: "A printed rota is quick to make, but after a few weeks it's out of date: someone moves out, someone goes on holiday, and nobody writes down who already cleaned. In the app the order works itself out, and chores get ticked off in the app instead of on paper.",
      },
      events: {
        heading: "Events in the same calendar",
        body: "Next to chores you add events: the house meeting, the landlord's visit or when the meter gets read. With a time or all day, once or repeating. The month view shows everything at a glance.",
      },
      couples: {
        heading: "A chore rota for couples and big flatshares",
        body: "The rota works the same for a couple as for a five-person flatshare: as two, you swap every week or set fixed days. It belongs to the same group as your shopping lists and shared expenses, so it's one app and one invite for everything.",
      },
      limits: {
        heading: "What the chore rota can't do",
        reminders:
          "No push reminders: Flatsby doesn't ping you, you see your chores when you open the app.",
        points: "No points or leaderboards.",
        swap: "You can't swap chores, only skip them. Whoever covers for someone still ticks the chore off, and the history shows who really did it.",
        live: "Not live: you see what others ticked off when the app reloads, so when you open it or pull down.",
        alternatives:
          "Before you decide, here's what's missing. If reminders or points matter to you, an app like Flatastic or Sweepy may suit you better.",
      },
    },
    flatastic: {
      title: "Flatastic alternative: free and without ads | Flatsby",
      description:
        "Flatsby vs. Flatastic: chore rota, unlimited shopping lists and bill splitting without ads, plus a household calendar. And where Flatastic is ahead.",
      headline:
        "A Flatastic alternative without ads and without Premium for everyday flatshare life",
      intro:
        "Flatastic is one of the best-known flatshare apps, and rightly so. Flatsby covers everyday flatshare life too, with a chore rota, a shopping list and shared money, but shows no ads and puts none of it behind Premium. On top, there's a calendar for your events.",
      table: {
        caption:
          "Flatsby and Flatastic compared. Flatastic details from the App Store, Google Play and flatastic-app.com, checked on 23 October 2026.",
        chores: "Chore rota",
        choresFlatastic: "Yes, with points",
        reminders: "Push reminders",
        calendar: "Calendar for events",
        pinboard: "Pinboard",
        lists: "Shared shopping list",
        listsFlatsby: "Yes, unlimited lists",
        listsFlatastic: "Yes, several lists with Premium",
        expenses: "Bill splitting",
        ads: "Ads in the free version",
        adsFlatastic: "Yes, ad-free from €1.99 a month",
        history: "Chore history",
        free: "Free",
        withPremium: "With Premium",
        export: "Data export",
        exportFlatastic: "CSV export with Premium",
        households: "Several households per account",
        signIn: "Sign in",
        signInFlatsby: "Google or Apple",
        signInFlatastic: "Email and password",
        platforms: "Platforms",
      },
      free: {
        heading: "What's free in Flatsby",
        body: "Free: unlimited shopping lists, the chore rota with history, the calendar, expenses and settlements, and the data export. Without ads and with no member limit. Paid plans only add AI credits, for the AI assistant and automatic sorting into categories.",
      },
      rent: {
        heading: "For rent that isn't split evenly",
        body: "You split expenses equally, by percentage, by shares or by exact amounts, for example rent by room size or by income. Flatsby works out the fewest payments that settle everyone up. There are no recurring expenses, so you add the rent again each month.",
      },
      better: {
        heading: "Where Flatastic is ahead",
        body: "Flatastic sends push reminders for due chores, awards points for cleaning and has a pinboard. Flatsby does none of that. Flatastic has thousands of ratings in the app stores, and you sign in with email and password instead of Google or Apple. If reminders or points matter to you, stay with Flatastic.",
      },
      data: {
        heading: "Your data",
        body: "Database and servers are in Frankfurt, with cloud providers in their EU region, and usage analytics work without ad tracking. The AI assistant only sends data to OpenAI or Google after you consent. For automatic categories, only the name of a new item or expense goes to an AI model, and if you pick the category yourself, nothing is sent. A receipt you scan goes to OpenAI as a photo and isn't stored. You can export everything or delete your account in settings, with details in the privacy policy. The code is open source, and Flatsby is built by Raphael Mitas, an independent developer in Darmstadt.",
      },
      moving: {
        heading: "Switching from Flatastic to Flatsby",
        household:
          "One person creates the household in Flatsby and invites the others with a link, QR code or code.",
        chores: "Add your chores in the calendar and pick who takes turns.",
        balances:
          "Settle your open balances in Flatastic and start Flatsby at zero. There is no import from Flatastic.",
      },
    },
    pricing: {
      title: "Flatsby pricing: free, with optional Starter and Pro plans",
      description:
        "Shopping lists, expenses, settlements and groups are free with no member limit and no ads. Starter ({starterPrice, number, ::currency/USD}) and Pro ({proPrice, number, ::currency/USD}) add AI credits.",
      headline: "Free for the whole household",
      intro:
        "Everything a shared flat needs is free: shopping lists, expenses, settling up and groups, with no member limit and no ads. You only pay for more AI credits.",
      table: {
        caption: "Plans and monthly AI credits",
        core: "Shopping lists, expenses and settlements",
        members: "Members per household",
        ads: "Ads",
        credits: "AI credits per month",
        price: "Price on the web",
      },
      credits: {
        heading: "What credits are for",
        body: "The AI assistant and automatic categories use credits. When they run out, the assistant pauses and new items get the category Other until the next month. Nothing else in Flatsby uses credits.",
      },
      buy: {
        heading: "Where to buy",
        body: "On the web, open Billing after you sign in to choose Starter or Pro. The Android app links to that page. On iPhone, Pro is an in-app purchase at {proAppStorePrice, number, ::currency/USD} a month in the US App Store.",
      },
    },
    faq: {
      title: "Flatsby FAQ: shared shopping lists and bill splitting",
      description:
        "Answers about Flatsby: price, Android and iPhone, splitting rent by percentage, moving from Splitwise, privacy and the AI assistant.",
      headline: "Questions about Flatsby",
      intro:
        "Short answers to what people ask before they move their household into Flatsby.",
    },
  },
  demo: {
    milk: "Milk",
    bread: "Bread",
    apples: "Apples",
    eggs: "Eggs",
    groceries: "Groceries",
    electricity: "Electricity Bill",
    chatRequest: "Add milk and bread to the shopping list",
    chatReply: "Done! I've added those items to your shopping list.",
    chatPlaceholder: "Ask me anything...",
  },
};
