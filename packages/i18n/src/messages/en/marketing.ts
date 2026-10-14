export const marketing = {
  title: "Flatsby: shared shopping list and bill splitting app",
  description:
    "Free app for flatmates and roommates: one shared shopping list and bills split equally, by percentage, by shares or exact amounts. Web, iPhone and Android.",
  headline: "Shared shopping lists and bill splitting for flatmates",
  freeOn: "Free on web, iPhone and Android",
  subheadline:
    "One shopping list for the whole household, expenses split equally, by percentage, by shares or exact amounts, and a running balance of who owes whom. Free on web, iPhone and Android.",
  ogImageAlt: "Flatsby: shared shopping lists and bill splitting",
  nav: {
    shoppingLists: "Shopping lists",
    expenses: "Expenses",
    expenseSplitting: "Expense splitting",
    aiAssistant: "AI assistant",
    splitwiseAlternative: "Splitwise alternative",
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
    lists: {
      title: "Shared shopping lists",
      body: "Everyone in the household works from the same lists on the web and on their phone. Whoever is in the shop ticks items off, and everyone else sees it the next time they open the list.",
    },
    expenses: {
      title: "Expense splitting",
      body: "Log what you paid and split it equally, by percentage, by shares or by exact amounts. Flatsby keeps a running balance per person and simplifies debts, so fewer payments settle everyone up.",
    },
    assistant: {
      title: "AI assistant",
      body: "On the web, ask about your household in plain language. It reads your lists and expenses, answers with charts and tables, and can add items or expenses for you.",
    },
    groups: {
      title: "Household groups",
      body: "A group is your household. Each flatmate signs in once, then a group admin adds them by the email on their account. Every list and expense stays inside the group.",
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
      title: "Add flatmates",
      body: "Once they have signed in, add them to the group by their email.",
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
        "A household app for people who live together: shared shopping lists, shared expenses and settling up.",
    },
    audience: {
      label: "Who it is for",
      value: "Flatmates or roommates, couples and families who share a home.",
    },
    platforms: {
      label: "Platforms",
      value:
        "Web at flatsby.com, iPhone and Android. Same account and data everywhere.",
    },
    price: {
      label: "Price",
      value:
        "Free. AI features use monthly credits: {freeCredits, number} free, more on Starter ({starterPrice, number, ::currency/USD} a month) or Pro ({proPrice, number, ::currency/USD} a month on the web, {proAppStorePrice, number, ::currency/USD} in the US App Store).",
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
      value: "No member limit. No recurring expenses yet.",
    },
    data: {
      label: "Your data",
      value: "Export everything or delete your account from settings.",
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
      question: "Is Flatsby free?",
      answer:
        "Yes. Shopping lists, expenses, settlements and groups are free, with no member limit. The AI assistant and automatic categories use credits: {freeCredits, number} a month for free, {starterCredits, number} on Starter ({starterPrice, number, ::currency/USD} a month) and {proCredits, number} on Pro ({proPrice, number, ::currency/USD} a month on the web). On iPhone, Pro is {proAppStorePrice, number, ::currency/USD} a month in the US App Store.",
    },
    android: {
      question: "Does Flatsby work on Android?",
      answer:
        "Yes. Flatsby is in the Google Play Store, the App Store and on the web at flatsby.com. It is the same account and the same data on every device.",
    },
    splitwise: {
      question: "Can I move my expenses over from Splitwise?",
      answer:
        "Yes. Export your group from Splitwise as CSV, then upload it under Group settings, Import expenses. You pick the currency and match Splitwise names to your flatmates. Each expense keeps the exact amount every person owed, so percentage splits arrive as amounts. Rows in other currencies or with several payers are skipped, and the preview lists them first.",
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
        "There is no member limit. A group admin adds each flatmate by the email they signed in with.",
    },
    web: {
      question: "Is the web app the same as the phone apps?",
      answer:
        "Almost. Lists, expenses, settlements and group settings work on the web, iPhone and Android. The AI assistant is web only for now.",
    },
    realtime: {
      question: "Do shopping lists update in real time?",
      answer:
        "Not instantly. Everyone shares the same lists, and a flatmate's changes show up when you open the list again or come back to the app or tab.",
    },
    assistant: {
      question: "What does the AI assistant do?",
      answer:
        "In the web app, you ask about your household in plain language. It reads your lists and expenses, answers with charts and tables, and can add items or expenses for you.",
    },
    privacy: {
      question: "Who can see my household's data?",
      answer:
        "Inside Flatsby, only members of your group. The hosting, analytics and AI providers listed in the privacy policy process it to run the app. Two features send data through the Vercel AI Gateway. The AI assistant asks for consent first, uses OpenAI or Google models, and its data is not used to train them. Automatic categories send the names of shopping items and expenses to a classification model. You can export all of your data or delete your account from your settings.",
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
        body: "There are no reminders or push notifications yet. Lists are for shopping, not for chores or to-dos.",
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
          "Automatic categories are separate from the assistant: when you add a shopping item or an expense, its name goes through the same gateway to a classification model so Flatsby can suggest a category.",
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
