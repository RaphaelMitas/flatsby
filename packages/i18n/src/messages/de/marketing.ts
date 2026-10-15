import type { Messages } from "../../messages";

export const marketing = {
  title: "Flatsby: App für gemeinsame Einkaufslisten und Kostenteilung",
  description:
    "Kostenlose App für Mitbewohner und WGs: eine gemeinsame Einkaufsliste und Rechnungen, die gleichmäßig, nach Prozent, nach Anteilen oder mit genauen Beträgen geteilt werden. Web, iPhone und Android.",
  headline: "Gemeinsame Einkaufslisten und Kostenteilung für Mitbewohner",
  freeOn: "Kostenlos im Web, auf dem iPhone und auf Android",
  subheadline:
    "Eine Einkaufsliste für den ganzen Haushalt, Ausgaben gleichmäßig, nach Prozent, nach Anteilen oder mit genauen Beträgen geteilt, und ein laufender Kontostand, wer wem was schuldet. Kostenlos im Web, auf dem iPhone und auf Android.",
  ogImageAlt: "Flatsby: gemeinsame Einkaufslisten und Kostenteilung",
  nav: {
    shoppingLists: "Einkaufslisten",
    expenses: "Ausgaben",
    expenseSplitting: "Kosten teilen",
    aiAssistant: "KI-Assistent",
    splitwiseAlternative: "Splitwise-Alternative",
    pricing: "Preise",
    faq: "FAQ",
    signIn: "Anmelden",
    getStarted: "Loslegen",
    product: "Produkt",
    getTheApp: "App holen",
    webApp: "Web-App",
    appStore: "App Store",
    googlePlay: "Google Play",
    sourceCode: "Quellcode",
    legal: "Rechtliches",
    terms: "Nutzungsbedingungen",
    privacy: "Datenschutz",
    legalNotice: "Impressum",
    language: "Sprache",
  },
  hero: {
    openInBrowser: "Im Browser öffnen",
    appStore: "Im App Store laden",
    googlePlay: "Bei Google Play holen",
  },
  features: {
    heading: "Alles, was du für deinen Haushalt brauchst",
    examples: "Die Listen, Ausgaben und der Chat unten sind Beispiele.",
    lists: {
      title: "Gemeinsame Einkaufslisten",
      body: "Alle im Haushalt arbeiten mit denselben Listen, im Web und auf dem Handy. Wer gerade im Laden ist, hakt Artikel ab, und alle anderen sehen es, sobald sie die Liste das nächste Mal öffnen.",
    },
    expenses: {
      title: "Kosten teilen",
      body: "Trag ein, was du bezahlt hast, und teile es gleichmäßig, nach Prozent, nach Anteilen oder mit genauen Beträgen. Flatsby führt für jede Person einen laufenden Kontostand und vereinfacht die Schulden, damit weniger Zahlungen nötig sind, um alles auszugleichen.",
    },
    assistant: {
      title: "KI-Assistent",
      body: "Frag im Web in ganz normaler Sprache nach deinem Haushalt. Er liest deine Listen und Ausgaben, antwortet mit Diagrammen und Tabellen und kann Artikel oder Ausgaben für dich hinzufügen.",
    },
    groups: {
      title: "Haushaltsgruppen",
      body: "Eine Gruppe ist dein Haushalt. Jeder Mitbewohner meldet sich einmal an, danach fügt ein Gruppenadmin ihn über die E-Mail-Adresse seines Kontos hinzu. Jede Liste und jede Ausgabe bleibt in der Gruppe.",
    },
  },
  steps: {
    heading: "In 3 einfachen Schritten loslegen",
    signIn: {
      title: "Anmelden",
      body: "Nutze dein Google- oder Apple-Konto im Web oder in der App für iPhone oder Android.",
    },
    createGroup: {
      title: "Haushalt anlegen",
      body: "Leg eine Gruppe für dein Zuhause an. Du wirst ihr Admin.",
    },
    addFlatmates: {
      title: "Mitbewohner hinzufügen",
      body: "Sobald sie sich angemeldet haben, fügst du sie über ihre E-Mail-Adresse zur Gruppe hinzu.",
    },
  },
  sections: {
    splitwise: {
      title: "Von Splitwise wechseln",
      body: "Flatsby importiert einen CSV-Export aus Splitwise, sodass dein Verlauf mitkommt. Exportiere in Splitwise die Gruppe als CSV. Öffne in Flatsby die Gruppeneinstellungen, dann Ausgaben importieren, wähle die Währung, ordne die Namen aus Splitwise deinen Mitbewohnern zu und lade die Datei hoch. Die Vorschau zeigt alle Zeilen, die übersprungen werden, etwa andere Währungen oder Ausgaben mit mehreren Zahlenden, bevor irgendetwas importiert wird.",
    },
    about: {
      title: "Wer Flatsby macht",
      body: "Flatsby wird von Raphael Mitas entwickelt, einem unabhängigen Entwickler aus Darmstadt. Der Code ist Open Source auf GitHub, und Releases gehen aus demselben Repository ins Web, in den App Store und zu Google Play.",
    },
  },
  facts: {
    heading: "Flatsby auf einen Blick",
    whatItIs: {
      label: "Was es ist",
      value:
        "Eine Haushalts-App für Menschen, die zusammenwohnen: gemeinsame Einkaufslisten, gemeinsame Ausgaben und Ausgleichen.",
    },
    audience: {
      label: "Für wen",
      value:
        "Mitbewohner, WGs, Paare und Familien, die sich ein Zuhause teilen.",
    },
    platforms: {
      label: "Plattformen",
      value:
        "Web unter flatsby.com, iPhone und Android. Überall dasselbe Konto und dieselben Daten.",
    },
    price: {
      label: "Preis",
      value:
        "Kostenlos. KI-Funktionen nutzen monatliche Credits: {freeCredits, number} kostenlos, mehr mit Starter ({starterPrice, number, ::currency/USD} im Monat) oder Pro ({proPrice, number, ::currency/USD} im Monat im Web, {proAppStorePrice, number, ::currency/USD} im US-App-Store).",
    },
    signIn: { label: "Anmeldung", value: "Google- oder Apple-Konto." },
    splitting: {
      label: "Aufteilen",
      value:
        "Gleichmäßig, nach Prozent, nach Anteilen oder mit genauen Beträgen. EUR, USD, GBP und CHF.",
    },
    switching: {
      label: "Wechsel",
      value: "Importiert einen CSV-Export aus Splitwise.",
    },
    limits: {
      label: "Grenzen",
      value: "Keine Mitgliederbegrenzung. Noch keine wiederkehrenden Ausgaben.",
    },
    data: {
      label: "Deine Daten",
      value: "Exportiere alles oder lösche dein Konto in den Einstellungen.",
    },
    source: {
      label: "Quellcode",
      value: "Open Source, MIT-Lizenz. Keine öffentliche API für andere Apps.",
    },
  },
  faq: {
    heading: "Fragen",
    allQuestions: "Alle Fragen",
    free: {
      question: "Ist Flatsby kostenlos?",
      answer:
        "Ja. Einkaufslisten, Ausgaben, Ausgleichszahlungen und Gruppen sind kostenlos, ohne Mitgliederbegrenzung. Der KI-Assistent und die automatischen Kategorien nutzen Credits: {freeCredits, number} im Monat kostenlos, {starterCredits, number} mit Starter ({starterPrice, number, ::currency/USD} im Monat) und {proCredits, number} mit Pro ({proPrice, number, ::currency/USD} im Monat im Web). Auf dem iPhone kostet Pro {proAppStorePrice, number, ::currency/USD} im Monat im US-App-Store.",
    },
    android: {
      question: "Funktioniert Flatsby auf Android?",
      answer:
        "Ja. Flatsby gibt es im Google Play Store, im App Store und im Web unter flatsby.com. Auf jedem Gerät ist es dasselbe Konto mit denselben Daten.",
    },
    splitwise: {
      question: "Kann ich meine Ausgaben aus Splitwise übernehmen?",
      answer:
        "Ja. Exportiere deine Gruppe in Splitwise als CSV und lade sie dann unter Gruppeneinstellungen, Ausgaben importieren hoch. Du wählst die Währung und ordnest die Namen aus Splitwise deinen Mitbewohnern zu. Jede Ausgabe behält den genauen Betrag, den jede Person geschuldet hat, prozentuale Aufteilungen kommen also als Beträge an. Zeilen in anderen Währungen oder mit mehreren Zahlenden werden übersprungen, und die Vorschau zeigt sie vorher an.",
    },
    split: {
      question: "Wie teilt Flatsby eine Ausgabe auf?",
      answer:
        "Gleichmäßig, nach Prozent, nach Anteilen (zum Beispiel 2 zu 1) oder mit genauen Beträgen pro Person. Ausgaben können in EUR, USD, GBP oder CHF sein, und Flatsby führt für jede Person einen laufenden Kontostand pro Währung.",
    },
    rent: {
      question: "Kann ich die Miete als wiederkehrende Ausgabe anlegen?",
      answer:
        "Noch nicht. Trag die Miete jeden Monat als neue Ausgabe ein. Jede Ausgabe behält ihre eigene Aufteilung, sodass eine Miete im Verhältnis 60/40 und ein Einkauf im Verhältnis 50/50 im selben Kontostand stehen können.",
    },
    members: {
      question: "Wie viele Personen können in einem Haushalt sein?",
      answer:
        "Es gibt keine Mitgliederbegrenzung. Ein Gruppenadmin fügt jeden Mitbewohner über die E-Mail-Adresse hinzu, mit der er sich angemeldet hat.",
    },
    web: {
      question: "Ist die Web-App dieselbe wie die Handy-Apps?",
      answer:
        "Fast. Listen, Ausgaben, Ausgleichszahlungen und Gruppeneinstellungen funktionieren im Web, auf dem iPhone und auf Android. Den KI-Assistenten gibt es vorerst nur im Web.",
    },
    realtime: {
      question: "Aktualisieren sich Einkaufslisten in Echtzeit?",
      answer:
        "Nicht sofort. Alle teilen dieselben Listen, und die Änderungen eines Mitbewohners erscheinen, wenn du die Liste erneut öffnest oder zur App oder zum Tab zurückkehrst.",
    },
    assistant: {
      question: "Was macht der KI-Assistent?",
      answer:
        "In der Web-App fragst du in ganz normaler Sprache nach deinem Haushalt. Er liest deine Listen und Ausgaben, antwortet mit Diagrammen und Tabellen und kann Artikel oder Ausgaben für dich hinzufügen.",
    },
    privacy: {
      question: "Wer kann die Daten meines Haushalts sehen?",
      answer:
        "Innerhalb von Flatsby nur die Mitglieder deiner Gruppe. Die in der Datenschutzerklärung genannten Hosting-, Analyse- und KI-Anbieter verarbeiten sie, um die App zu betreiben. Zwei Funktionen senden Daten über das Vercel AI Gateway. Der KI-Assistent fragt vorher nach deiner Einwilligung, nutzt Modelle von OpenAI oder Google, und seine Daten werden nicht zum Training dieser Modelle verwendet. Die automatischen Kategorien senden die Namen von Einkaufsartikeln und Ausgaben an ein Klassifizierungsmodell. Du kannst alle deine Daten exportieren oder dein Konto in deinen Einstellungen löschen.",
    },
    openSource: {
      question: "Ist Flatsby Open Source?",
      answer:
        "Ja. Der Code für die Web-App, die mobilen Apps und den Server liegt unter der MIT-Lizenz auf GitHub. Es gibt keine öffentliche API für andere Apps.",
    },
  },
  cta: {
    heading: "Bereit, deinen Haushalt einfacher zu machen?",
    note: "Kostenlos im Web, auf dem iPhone und auf Android. Melde dich mit Google oder Apple an.",
    button: "Kostenlos loslegen",
  },
  contentPage: {
    updated: "Aktualisiert am <time>{date}</time>",
    howItWorks: "So funktioniert Flatsby",
    more: "Mehr über Flatsby",
  },
  screenshots: {
    webHome: "Startseite von Flatsby im Web",
    webLists: "Eine gemeinsame Einkaufsliste in der Flatsby-Web-App",
    webExpenses:
      "Liste gemeinsamer Ausgaben mit Angabe, wer bezahlt hat und wie geteilt wurde",
    webChat:
      "Der KI-Assistent beantwortet eine Frage zu Ausgaben mit einem Diagramm",
    iosList: "Eine gemeinsame Einkaufsliste auf dem iPhone",
    iosSplit: "Eine Ausgabe unter Mitbewohnern aufteilen auf dem iPhone",
  },
  table: {
    yes: "Ja",
    no: "Nein",
    none: "Keine",
    noLimit: "Unbegrenzt",
    pro: "Pro",
    platforms: "Web, iPhone, Android",
  },
  plans: {
    free: "Kostenlos",
    starter: "Starter",
    pro: "Pro",
    credits: "{credits, number}",
    perMonth: "{price, number, ::currency/USD} im Monat",
  },
  pages: {
    shoppingLists: {
      title: "Gemeinsame Einkaufslisten-App für Mitbewohner | Flatsby",
      description:
        "Eine Einkaufsliste für die ganze WG im Web, auf dem iPhone und auf Android, nach Kategorien sortiert und mit Angabe, wer welchen Artikel hinzugefügt hat. Kostenlos.",
      headline: "Eine gemeinsame Einkaufsliste für die ganze WG",
      intro:
        "Alle in deinem Haushalt schreiben auf dieselben Listen, vom eigenen Handy oder Browser aus. Wer gerade im Laden ist, hakt ab, und der Artikel ist auch für alle anderen erledigt.",
      howItWorks: {
        heading: "So funktioniert es",
        lists:
          "Leg so viele Listen an, wie dein Haushalt braucht, zum Beispiel eine für Lebensmittel und eine für den Baumarkt. Alle in der Gruppe können Artikel hinzufügen, bearbeiten oder abhaken.",
        categories:
          "Jeder Artikel hat eine Kategorie wie Obst und Gemüse, Milchprodukte oder Backwaren, sodass sich die Liste so sortiert, wie ein Laden aufgebaut ist. Wenn du einen Artikel hinzufügst, kann Flatsby die Kategorie vorschlagen, indem es den Artikelnamen an ein Klassifizierungsmodell sendet, und du kannst sie ändern. Das verbraucht KI-Credits.",
      },
      devices: {
        heading: "Dieselbe Liste auf jedem Gerät",
        body: "Dieselben Listen öffnen sich im Web, auf dem iPhone und auf Android. Änderungen werden noch nicht live übertragen: Die Änderungen eines Mitbewohners erscheinen, wenn du die Liste erneut öffnest oder zur App oder zum Tab zurückkehrst.",
      },
      limits: {
        heading: "Was es nicht kann",
        body: "Es gibt noch keine Erinnerungen oder Push-Benachrichtigungen. Die Listen sind zum Einkaufen gedacht, nicht für Hausarbeit oder To-dos.",
      },
    },
    expenses: {
      title: "Rechnungen und Ausgaben mit Mitbewohnern teilen | Flatsby",
      description:
        "Trag gemeinsame Kosten ein, teile sie gleichmäßig, nach Prozent, nach Anteilen oder mit genauen Beträgen und sieh, wer wem was schuldet. Mit weniger Zahlungen ausgleichen. Kostenlos.",
      headline:
        "Rechnungen mit deinen Mitbewohnern teilen, ohne Tabellenkalkulation",
      intro:
        "Trag ein, was du bezahlt hast, wähle, wie es geteilt wird, und Flatsby führt einen laufenden Kontostand für alle im Haushalt.",
      splits: {
        heading: "Vier Arten zu teilen",
        equal: "Gleichmäßig auf alle oder auf die Personen, die du auswählst.",
        percentage:
          "Nach Prozent, zum Beispiel die Miete im Verhältnis 60/40 nach Zimmergröße.",
        shares:
          "Nach Anteilen, zum Beispiel 2 zu 1, wenn eine Person doppelt so viel verbraucht.",
        exact:
          "Mit genauen Beträgen, wenn jede Person eine bestimmte Summe schuldet.",
        body: "Jede Ausgabe behält ihre eigene Aufteilung, sodass eine Mietzahlung im Verhältnis 60/40 und ein Einkauf im Verhältnis 50/50 nebeneinander im selben Kontostand stehen können.",
      },
      balances: {
        heading: "Kontostände und Ausgleichen",
        owes: "Flatsby zeigt, was jede Person schuldet oder bekommt. Es vereinfacht die Schulden, damit der Haushalt weniger Zahlungen braucht, um wieder bei null zu sein.",
        settlement:
          "Wenn jemand einem Mitbewohner Geld zurückzahlt, trag es als Ausgleichszahlung ein, und beide Kontostände werden aktualisiert.",
      },
      currencies: {
        heading: "Währungen und Kategorien",
        currencies:
          "Ausgaben können in EUR, USD, GBP oder CHF sein. Flatsby rechnet nicht zwischen Währungen um. Stattdessen gibt es für jede Währung einen eigenen Kontostand.",
        categories:
          "Jede Ausgabe hat eine Kategorie, etwa Lebensmittel, Internet oder Haushaltswaren, damit du siehst, wohin das Geld geht.",
      },
      recurring: {
        heading: "Miete und andere wiederkehrende Kosten",
        body: "Es gibt noch keine wiederkehrenden Ausgaben. Trag die Miete jeden Monat als neue Ausgabe ein.",
      },
    },
    aiAssistant: {
      title: "KI-Assistent für deinen Haushalt | Flatsby",
      description:
        "Frag im Web in ganz normaler Sprache nach euren gemeinsamen Listen und Ausgaben. Bekomm Diagramme und Tabellen, oder lass Artikel und Ausgaben für dich hinzufügen.",
      headline: "Frag deinen Haushalt, was du willst",
      intro:
        "Der Assistent liest die Einkaufslisten und Ausgaben deiner Gruppe und antwortet in ganz normaler Sprache, mit Diagrammen und Tabellen, wenn Zahlen helfen. Es gibt ihn in der Web-App, die Apps für iPhone und Android haben ihn noch nicht.",
      questions: {
        heading: "Was du fragen kannst",
        groceries:
          "Wie viel haben wir letzten Monat für Lebensmittel ausgegeben?",
        paidMost: "Wer hat dieses Jahr am meisten bezahlt?",
        addItems: "Setz Nudeln, Tomaten und Parmesan auf die Einkaufsliste.",
        logExpense:
          "Trag 45 Euro für Lebensmittel ein, von mir bezahlt, gleichmäßig geteilt.",
      },
      data: {
        heading: "Deine Daten und die KI-Anbieter",
        consent:
          "Der Assistent fragt nach deiner Einwilligung, bevor er etwas sendet. Deine Nachrichten sowie die Listenartikel, Ausgaben und Mitgliedernamen, die eine Frage braucht, gehen über das Vercel AI Gateway an OpenAI oder Google, um die Antwort zu erzeugen.",
        categories:
          "Die automatischen Kategorien sind vom Assistenten getrennt: Wenn du einen Einkaufsartikel oder eine Ausgabe hinzufügst, geht ihr Name über dasselbe Gateway an ein Klassifizierungsmodell, damit Flatsby eine Kategorie vorschlagen kann.",
        training:
          "Deine E-Mail-Adresse und deine Anmeldedaten werden nicht an die KI-Anbieter gesendet. Daten, die für den Assistenten gesendet werden, dienen dazu, die Antwort zu erzeugen, nicht zum Training von Modellen. KI-Nutzungszahlen wie das Modell und die Anzahl der Tokens gehen ohne deine Nachrichten zur Analyse an PostHog.",
      },
      credits: {
        heading: "Credits",
        body: "Der Assistent und die automatischen Kategorien nutzen Credits: {freeCredits, number} im Monat im kostenlosen Tarif, mehr mit Starter und Pro. Wenn die Credits aufgebraucht sind, bekommen neue Artikel bis zum nächsten Monat die Kategorie Sonstiges. Listen, Ausgaben und Ausgleichen brauchen nie Credits.",
      },
    },
    splitwise: {
      title: "Splitwise-Alternative für Mitbewohner | Flatsby",
      description:
        "Flatsby vs. Splitwise: kein tägliches Limit für Ausgaben, keine Werbung, eine eingebaute gemeinsame Einkaufsliste und ein Import für CSV-Exporte aus Splitwise. Und wo Splitwise besser ist.",
      headline: "Eine Splitwise-Alternative für WGs",
      intro:
        "Splitwise ist der Standard zum Teilen von Rechnungen, und es macht das gut. Flatsby ist für Haushalte, die zusätzlich eine gemeinsame Einkaufsliste wollen und kein tägliches Limit beim Eintragen von Ausgaben.",
      table: {
        caption:
          "Flatsby und Splitwise im Vergleich. Die Angaben zu Splitwise stammen von splitwise.com/pro, geprüft im Oktober 2026.",
        lists: "Gemeinsame Einkaufslisten",
        listsFlatsby: "Ja, auf jedem Gerät",
        limit: "Limit für neue Ausgaben pro Tag (kostenlos)",
        limitSplitwise: "Ja, Pro hebt es auf",
        ads: "Werbung (kostenlos)",
        adsSplitwise: "Ja, Pro ist werbefrei",
        split:
          "Gleichmäßig, nach Prozent, nach Anteilen oder mit genauen Beträgen teilen",
        simplify: "Schulden vereinfachen",
        currency: "Währungsumrechnung",
        currencyFlatsby: "Nein, Kontostände pro Währung",
        receipts: "Belege scannen",
        charts: "Ausgabendiagramme",
        chartsFlatsby: "Über den KI-Assistenten (verbraucht Credits)",
        outside: "Ausgaben außerhalb einer Gruppe",
        platforms: "Plattformen",
        openSource: "Open Source",
        openSourceFlatsby: "Ja, MIT-Lizenz",
      },
      better: {
        heading: "Wo Splitwise besser ist",
        body: "Splitwise Pro rechnet Währungen um, scannt Belege und schlüsselt sie auf und importiert in den USA Kartentransaktionen. Splitwise kann außerdem einmalige Ausgaben mit einer Person außerhalb einer Gruppe. Es gibt Splitwise schon seit Jahren, und die meisten haben dort bereits ein Konto. Wenn dir das wichtiger ist als eine gemeinsame Einkaufsliste, bleib bei Splitwise.",
      },
      moving: {
        heading: "Von Splitwise zu Flatsby wechseln",
        export:
          "Öffne in Splitwise im Web die Gruppe und exportiere sie als Tabelle (CSV).",
        group:
          "Leg in Flatsby deine Haushaltsgruppe an und füge deine Mitbewohner hinzu.",
        upload:
          "Öffne die Gruppeneinstellungen, wähle Ausgaben importieren, wähle die Währung und lade die CSV-Datei hoch.",
        match: "Ordne jeden Namen aus Splitwise einem Mitbewohner zu.",
        preview:
          "Prüf die Vorschau. Sie zeigt die Zeilen, die übersprungen werden, etwa andere Währungen, Ausgaben mit mehreren Zahlenden oder Aufteilungen, die nicht aufgehen.",
        import:
          "Importieren. Jede Ausgabe behält den genauen Betrag, den jede Person geschuldet hat, prozentuale Aufteilungen kommen also als Beträge an, nicht als Prozente.",
      },
    },
    pricing: {
      title:
        "Flatsby-Preise: kostenlos, mit den optionalen Tarifen Starter und Pro",
      description:
        "Einkaufslisten, Ausgaben, Ausgleichszahlungen und Gruppen sind kostenlos, ohne Mitgliederbegrenzung und ohne Werbung. Starter ({starterPrice, number, ::currency/USD}) und Pro ({proPrice, number, ::currency/USD}) bringen zusätzliche KI-Credits.",
      headline: "Kostenlos für den ganzen Haushalt",
      intro:
        "Alles, was eine WG braucht, ist kostenlos: Einkaufslisten, Ausgaben, Ausgleichen und Gruppen, ohne Mitgliederbegrenzung und ohne Werbung. Du zahlst nur für zusätzliche KI-Credits.",
      table: {
        caption: "Tarife und monatliche KI-Credits",
        core: "Einkaufslisten, Ausgaben und Ausgleichszahlungen",
        members: "Mitglieder pro Haushalt",
        ads: "Werbung",
        credits: "KI-Credits pro Monat",
        price: "Preis im Web",
      },
      credits: {
        heading: "Wofür Credits da sind",
        body: "Der KI-Assistent und die automatischen Kategorien nutzen Credits. Wenn sie aufgebraucht sind, pausiert der Assistent, und neue Artikel bekommen bis zum nächsten Monat die Kategorie Sonstiges. Sonst verbraucht nichts in Flatsby Credits.",
      },
      buy: {
        heading: "Wo du kaufen kannst",
        body: "Öffne im Web nach der Anmeldung die Abrechnung, um Starter oder Pro zu wählen. Die Android-App verlinkt auf diese Seite. Auf dem iPhone ist Pro ein In-App-Kauf für {proAppStorePrice, number, ::currency/USD} im Monat im US-App-Store.",
      },
    },
    faq: {
      title: "Flatsby-FAQ: gemeinsame Einkaufslisten und Kostenteilung",
      description:
        "Antworten zu Flatsby: Preis, Android und iPhone, Miete nach Prozent teilen, Wechsel von Splitwise, Datenschutz und der KI-Assistent.",
      headline: "Fragen zu Flatsby",
      intro:
        "Kurze Antworten auf das, was Leute fragen, bevor sie ihren Haushalt in Flatsby umziehen.",
    },
  },
  demo: {
    milk: "Milch",
    bread: "Brot",
    apples: "Äpfel",
    eggs: "Eier",
    groceries: "Lebensmittel",
    electricity: "Stromrechnung",
    chatRequest: "Setz Milch und Brot auf die Einkaufsliste",
    chatReply:
      "Erledigt! Ich habe die Artikel auf deine Einkaufsliste gesetzt.",
    chatPlaceholder: "Frag mich etwas...",
  },
} satisfies Messages["marketing"];
