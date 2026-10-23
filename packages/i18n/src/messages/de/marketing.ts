import type { Messages } from "../../messages";

export const marketing = {
  title: "WG-App: Putzplan, Einkaufsliste & Kosten teilen | Flatsby",
  description:
    "Kostenlose WG-App ohne Werbung: ein Putzplan, bei dem ihr euch abwechselt, gemeinsame Einkaufslisten und Kosten teilen, etwa die Miete. iPhone, Android, Web.",
  headline: "Die WG-App für Putzplan, Einkaufsliste und Kosten teilen",
  freeOn: "Kostenlos im Web, auf dem iPhone und auf Android",
  subheadline:
    "Wer ist mit dem Bad dran, was fehlt im Kühlschrank, wer schuldet wem was? Flatsby beantwortet das für eure WG oder euch als Paar. Kostenlos, ohne Werbung, auf iPhone, Android und im Browser.",
  ogImageAlt: "Flatsby: Putzplan, Einkaufsliste und Kosten teilen",
  nav: {
    shoppingLists: "Einkaufslisten",
    calendar: "Putzplan",
    expenses: "Ausgaben",
    expenseSplitting: "Kosten teilen",
    aiAssistant: "KI-Assistent",
    splitwiseAlternative: "Splitwise-Alternative",
    flatasticAlternative: "Flatastic-Alternative",
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
    calendar: {
      title: "Putzplan und Kalender",
      body: "Leg Aufgaben wie Bad putzen oder Müll rausbringen einmal an und wähl, wer sich in welcher Reihenfolge abwechselt. Jede Person sieht, wann sie dran ist, auch Wochen im Voraus, und im Verlauf steht, wer was erledigt hat. Termine wie die WG-Versammlung kommen in denselben Kalender.",
      link: "Putzplan-App für WGs",
    },
    lists: {
      title: "Gemeinsame Einkaufslisten",
      body: "So viele Listen, wie ihr braucht, nach Kategorien sortiert wie im Laden. Die Kategorie wählst du selbst, oder Flatsby schlägt sie mit KI-Credits vor, von denen jeden Monat ein Kontingent kostenlos ist. Wer einkauft, hakt ab. Die anderen sehen neue Artikel, sobald die Liste neu lädt: beim Öffnen der App oder wenn sie die Liste herunterziehen.",
    },
    expenses: {
      title: "Kosten teilen",
      body: "Trag ein, was du bezahlt hast, und teil es gleichmäßig, nach Prozent, nach Anteilen oder mit genauen Beträgen, etwa die Miete nach Zimmergröße oder nach Einkommen. Kein Tageslimit für Ausgaben. Flatsby zeigt, wer wem was schuldet, und rechnet aus, mit welchen wenigen Zahlungen alle wieder bei null sind. Von Splitwise nimmst du deinen Verlauf per CSV-Import mit.",
    },
    assistant: {
      title: "Extra: KI-Assistent im Web",
      body: "Frag in normaler Sprache, etwa wie viel ihr letzten Monat für Lebensmittel ausgegeben habt. Er antwortet mit Diagrammen und Tabellen, kann Artikel oder Ausgaben für dich hinzufügen, fragt vorher nach deiner Einwilligung und ist optional.",
    },
    groups: {
      title: "Ein Haushalt, alle Geräte",
      body: "Wer den Haushalt anlegt, lädt die anderen per Link, QR-Code oder Code ein. iPhone, Android und Browser nutzen dasselbe Konto und dieselben Daten. Die Anmeldung läuft über Google oder Apple.",
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
      title: "Mitbewohner einladen",
      body: "Schick ihnen einen Link, zeig ihnen einen QR-Code oder lies den Code vor. Sie treten mit einem Tippen bei.",
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
        "Eine App für Menschen, die zusammenwohnen: Putzplan mit Kalender, gemeinsame Einkaufslisten, gemeinsame Ausgaben und Ausgleichen.",
    },
    audience: {
      label: "Für wen",
      value:
        "Mitbewohner, WGs, Paare und Familien, die sich ein Zuhause teilen.",
    },
    platforms: {
      label: "Plattformen",
      value:
        "iPhone, Android und Web unter flatsby.com, auf Deutsch und Englisch. Überall dasselbe Konto und dieselben Daten.",
    },
    price: {
      label: "Preis",
      value:
        "Kostenlos, ohne Werbung und ohne Mitgliederbegrenzung. Kategorien wählst du kostenlos selbst. Bezahlt wird nur für zusätzliche KI-Credits, mit denen der KI-Assistent und die automatischen Kategorien arbeiten. Ein monatliches Kontingent ist kostenlos.",
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
      value:
        "Keine Push-Erinnerungen. Keine wiederkehrenden Ausgaben. Nicht live: Änderungen der anderen erscheinen, wenn die App neu lädt, also beim Öffnen, beim Zurückkehren oder durch Herunterziehen.",
    },
    data: {
      label: "Deine Daten",
      value:
        "Datenbank und Server in Frankfurt, bei Cloud-Anbietern mit EU-Region, Nutzungsstatistik ohne Werbe-Tracking. Der KI-Assistent schickt Daten erst nach deiner Einwilligung an OpenAI oder Google. Für die automatische Kategorie geht nur der Name eines neuen Artikels oder einer Ausgabe an ein KI-Modell, und wählst du die Kategorie selbst, geht nichts raus. Export und Kontolöschung jederzeit in den Einstellungen, Details in der Datenschutzerklärung.",
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
      question: "Ist Flatsby wirklich kostenlos und werbefrei?",
      answer:
        "Ja. Putzplan, Einkaufslisten, Ausgaben, Ausgleichszahlungen und Gruppen sind kostenlos, ohne Werbung und ohne Mitgliederbegrenzung. Geld verdient Flatsby nur mit optionalen KI-Credits. Der KI-Assistent und die automatischen Kategorien nutzen Credits: {freeCredits, number} im Monat kostenlos, {starterCredits, number} mit Starter ({starterPrice, number, ::currency/USD} im Monat) und {proCredits, number} mit Pro ({proPrice, number, ::currency/USD} im Monat im Web). Auf dem iPhone kostet Pro {proAppStorePrice, number, ::currency/USD} im Monat im US-App-Store.",
    },
    android: {
      question: "Funktioniert Flatsby auf Android?",
      answer:
        "Ja. Flatsby gibt es im Google Play Store, im App Store und im Web unter flatsby.com. Auf jedem Gerät ist es dasselbe Konto mit denselben Daten.",
    },
    splitwise: {
      question: "Kann ich meine Ausgaben aus Splitwise übernehmen?",
      answer:
        "Ja. Exportiere deine Gruppe in Splitwise als CSV und lade sie dann unter Gruppeneinstellungen, Ausgaben importieren hoch. Du wählst die Währung und ordnest die Namen aus Splitwise deinen Mitbewohnern zu. Jede Ausgabe behält den genauen Betrag, den jede Person geschuldet hat, prozentuale Aufteilungen kommen also als Beträge an. Zeilen in anderen Währungen oder mit mehreren Zahlenden werden übersprungen, und die Vorschau zeigt sie vorher an. Aus Tricount gibt es keinen Import.",
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
        "Es gibt keine Mitgliederbegrenzung. Ein Gruppenadmin lädt jeden Mitbewohner mit einem Link, QR-Code oder kurzen Code ein.",
    },
    web: {
      question: "Ist die Web-App dieselbe wie die Handy-Apps?",
      answer:
        "Fast. Listen, Ausgaben, Ausgleichszahlungen und Gruppeneinstellungen funktionieren im Web, auf dem iPhone und auf Android. Den KI-Assistenten gibt es vorerst nur im Web.",
    },
    realtime: {
      question: "Aktualisieren sich Einkaufslisten in Echtzeit?",
      answer:
        "Nicht sofort. Alle teilen dieselben Listen, und die Änderungen eines Mitbewohners erscheinen, wenn du die Liste erneut öffnest, zur App oder zum Tab zurückkehrst oder die Liste in der App herunterziehst.",
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
    chores: {
      question: "Kann Flatsby einen Putzplan führen?",
      answer:
        "Ja. Im Kalender legst du Aufgaben an, die sich täglich, wöchentlich, monatlich oder jährlich wiederholen, und wählst, wer sich in welcher Reihenfolge abwechselt. Jede Person sieht, wann sie dran ist, und der Verlauf zeigt, wer was erledigt hat. Push-Erinnerungen gibt es noch nicht.",
    },
    flatastic: {
      question: "Was ist eine gute Flatastic-Alternative?",
      answer:
        "Wenn ihr Putzplan, Einkaufsliste und Kosten teilen in einer App wollt, aber ohne Werbung, ist Flatsby eine kostenlose Alternative für iPhone, Android und Web. Wer nur Kosten teilen will, kommt mit Splitwise oder Tricount aus, für die Einkaufsliste allein mit Bring!.",
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
    iosCalendar:
      "Der Putzplan auf dem iPhone: die Woche mit Aufgaben und wer dran ist",
    webCalendar: "Der WG-Kalender im Web in der Monatsansicht",
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
        body: "Es gibt noch keine Erinnerungen oder Push-Benachrichtigungen. Die Listen sind zum Einkaufen gedacht. Für Hausarbeit gibt es den Putzplan im Kalender.",
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
    calendar: {
      title: "Putzplan-App für die WG: kostenlos, wer ist dran? | Flatsby",
      description:
        "WG-Putzplan als App: Aufgaben wechseln automatisch durch, jeder sieht, wann er dran ist, und der Verlauf zeigt, wer was erledigt hat. Kostenlos, ohne Werbung.",
      headline: "Der WG-Putzplan, bei dem klar ist, wer dran ist",
      intro:
        "Nie wieder „Wer war eigentlich mit dem Bad dran?“. In Flatsby legt ihr eure Aufgaben einmal an, wählt, wer sich abwechselt, und jede Person sieht in der App, wann sie dran ist. Kostenlos, ohne Werbung, auf iPhone, Android und im Browser.",
      setup: {
        heading: "Schnell eingerichtet",
        invite:
          "Haushalt anlegen und Mitbewohner per Link, QR-Code oder Code einladen.",
        tasks: "Aufgaben anlegen: Bad, Küche, Müll, Flur, was eben anfällt.",
        rotation:
          "Für jede Aufgabe wählen, wie oft sie ansteht (alle paar Tage, an bestimmten Wochentagen, monatlich oder jährlich) und wer sich in welcher Reihenfolge abwechselt. Oder sie offen lassen, dann kann sie jeder erledigen.",
      },
      mine: {
        heading: "Was liegt bei mir?",
        body: "Die Wochenansicht zeigt, was heute und in den nächsten Tagen ansteht, und ein Filter zeigt nur deine Aufgaben. Auf der Startseite der App siehst du, was heute bei dir liegt. Weil die Reihenfolge feststeht, weißt du schon Wochen vorher, wann du dran bist, praktisch bei Schichtdienst oder Urlaub.",
      },
      fair: {
        heading: "Fair, weil nachvollziehbar",
        body: "Der Verlauf jeder Aufgabe zeigt, wer sie wann erledigt hat. Verpasste Termine bleiben als überfällig stehen, mit der Anzahl, wie oft sie verpasst wurden, statt still zu verschwinden. Fällt ein Termin aus, etwa weil alle verreist sind, überspringst du ihn.",
      },
      template: {
        heading: "Putzplan-Vorlage oder App?",
        body: "Eine ausgedruckte Vorlage ist schnell gemacht, aber nach ein paar Wochen stimmt sie nicht mehr: Jemand zieht aus, jemand fährt in den Urlaub, und keiner trägt ein, wer schon geputzt hat. In der App rechnet sich die Reihenfolge selbst weiter, und abgehakt wird in der App statt auf Papier.",
      },
      events: {
        heading: "Termine im selben Kalender",
        body: "Neben Aufgaben trägst du Termine ein: die WG-Versammlung, den Besuch des Vermieters oder wann der Zähler abgelesen wird. Mit Uhrzeit oder ganztägig, einmalig oder wiederkehrend. Die Monatsansicht zeigt alles auf einen Blick.",
      },
      couples: {
        heading: "Putzplan für Paare und große WGs",
        body: "Der Putzplan funktioniert genauso für ein Paar wie für eine Fünfer-WG: Zu zweit wechselt ihr euch wöchentlich ab oder legt feste Tage fest. Er gehört zur selben Gruppe wie eure Einkaufslisten und gemeinsamen Ausgaben, also eine App und eine Einladung für alles.",
      },
      limits: {
        heading: "Was der Putzplan nicht kann",
        reminders:
          "Keine Push-Erinnerungen: Flatsby meldet sich nicht von selbst, ihr seht eure Aufgaben, wenn ihr die App öffnet.",
        points: "Keine Punkte oder Ranglisten.",
        swap: "Aufgaben tauschen geht nicht, nur überspringen. Wer für jemanden einspringt, hakt die Aufgabe trotzdem ab, und der Verlauf zeigt, wer sie wirklich erledigt hat.",
        live: "Nicht live: Was andere abhaken, siehst du, wenn die App neu lädt, also beim Öffnen oder durch Herunterziehen.",
        alternatives:
          "Bevor ihr euch entscheidet: Das fehlt noch. Wenn euch Erinnerungen oder Punkte wichtig sind, passt eine App wie Flatastic oder Sweepy vielleicht besser.",
      },
    },
    flatastic: {
      title: "Flatastic-Alternative: kostenlos und ohne Werbung | Flatsby",
      description:
        "Flatsby vs. Flatastic: Putzplan, beliebig viele Einkaufslisten und Kosten teilen ohne Werbung, dazu ein WG-Kalender. Und wo Flatastic vorne liegt.",
      headline:
        "Eine Flatastic-Alternative ohne Werbung und ohne Premium für den WG-Alltag",
      intro:
        "Flatastic ist eine der bekanntesten WG-Apps, und das zu Recht. Flatsby deckt den WG-Alltag ebenfalls ab, Putzplan, Einkaufsliste und gemeinsame Kasse, zeigt aber keine Werbung und sperrt nichts davon hinter Premium. Dazu kommt ein Kalender für eure Termine.",
      table: {
        caption:
          "Flatsby und Flatastic im Vergleich. Angaben zu Flatastic aus dem App Store, von Google Play und flatastic-app.com, geprüft am 23. Oktober 2026.",
        chores: "Putzplan",
        choresFlatastic: "Ja, mit Punktesystem",
        reminders: "Push-Erinnerungen",
        calendar: "Kalender für Termine",
        pinboard: "Pinnwand",
        lists: "Gemeinsame Einkaufsliste",
        listsFlatsby: "Ja, beliebig viele Listen",
        listsFlatastic: "Ja, mehrere Listen mit Premium",
        expenses: "Ausgaben teilen",
        ads: "Werbung in der kostenlosen Version",
        adsFlatastic: "Ja, werbefrei ab 1,99 € im Monat",
        history: "Verlauf des Putzplans",
        free: "Kostenlos",
        withPremium: "Mit Premium",
        export: "Daten exportieren",
        exportFlatastic: "CSV-Export mit Premium",
        households: "Mehrere Haushalte pro Konto",
        signIn: "Anmeldung",
        signInFlatsby: "Google oder Apple",
        signInFlatastic: "E-Mail und Passwort",
        platforms: "Plattformen",
      },
      free: {
        heading: "Was bei Flatsby kostenlos ist",
        body: "Kostenlos sind: beliebig viele Einkaufslisten, der Putzplan mit Verlauf, der Kalender, Ausgaben und Ausgleichszahlungen und der Datenexport. Ohne Werbung und ohne Mitgliederbegrenzung. Bezahlpläne gibt es nur für zusätzliche KI-Credits, also für den KI-Assistenten und die automatische Sortierung in Kategorien.",
      },
      rent: {
        heading: "Für Mieten, die nicht gleich verteilt sind",
        body: "Ausgaben teilt ihr gleichmäßig, nach Prozent, nach Anteilen oder mit genauen Beträgen, zum Beispiel die Miete nach Zimmergröße oder nach Einkommen. Flatsby rechnet aus, mit welchen wenigen Zahlungen alle wieder bei null sind. Wiederkehrende Ausgaben gibt es nicht, die Miete tragt ihr jeden Monat neu ein.",
      },
      better: {
        heading: "Wo Flatastic vorne liegt",
        body: "Flatastic erinnert per Push-Benachrichtigung an fällige Aufgaben, vergibt Punkte fürs Putzen und hat eine Pinnwand. Flatsby kann nichts davon. Flatastic hat Tausende Bewertungen in den App Stores, und du meldest dich mit E-Mail und Passwort an statt mit Google oder Apple. Wenn euch Erinnerungen oder Punkte wichtig sind, bleibt bei Flatastic.",
      },
      data: {
        heading: "Deine Daten",
        body: "Datenbank und Server stehen in Frankfurt, bei Cloud-Anbietern mit EU-Region, die Nutzungsstatistik kommt ohne Werbe-Tracking aus. Der KI-Assistent schickt Daten erst nach deiner Einwilligung an OpenAI oder Google. Für die automatische Kategorie geht nur der Name eines neuen Artikels oder einer Ausgabe an ein KI-Modell, und wählst du die Kategorie selbst, geht nichts raus. Du kannst alles exportieren oder dein Konto in den Einstellungen löschen, Details stehen in der Datenschutzerklärung. Der Code ist Open Source, und Flatsby wird von Raphael Mitas gebaut, einem unabhängigen Entwickler aus Darmstadt.",
      },
      moving: {
        heading: "Von Flatastic zu Flatsby wechseln",
        household:
          "Eine Person legt in Flatsby den Haushalt an und lädt die anderen per Link, QR-Code oder Code ein.",
        chores:
          "Tragt eure Putzaufgaben im Kalender ein und wählt, wer sich abwechselt.",
        balances:
          "Gleicht eure offenen Beträge in Flatastic aus und startet in Flatsby bei null. Einen Import aus Flatastic gibt es nicht.",
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
