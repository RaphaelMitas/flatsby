export const legal = {
  tableOfContents: "Table of Contents",
  version: "Version {version} · Last updated: {date}",
  index: {
    metaTitle: "Legal - Flatsby",
    metaDescription: "Legal information for Flatsby",
    heading: "Legal Information",
    intro: "Important legal documents and policies for using Flatsby",
    terms: "The rules and guidelines for using Flatsby",
    privacy: "How we collect, use, and protect your data",
    legalNotice: "Legal notice as required by German law",
  },
  terms: {
    metaTitle: "Terms of Service - Flatsby",
    metaDescription: "Terms of Service for using Flatsby",
    title: "Terms of Service",
    lastUpdated: "January 2026",
    toc: {
      acceptance: "Acceptance of Terms",
      description: "Description of Service",
      accounts: "User Accounts",
      conduct: "User Conduct",
      content: "User Content",
      termination: "Termination",
      disclaimer: "Disclaimer of Warranties",
      liability: "Limitation of Liability",
      changes: "Changes to Terms",
      contact: "Contact Information",
    },
    acceptance:
      'By accessing or using Flatsby ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.',
    description: {
      intro:
        "Flatsby is a collaborative household management application that enables users to:",
      lists: "Create and manage shared shopping lists",
      expenses: "Track and split expenses among household members",
      groups: "Organize household groups",
      ai: "Use AI-powered assistance for household tasks",
    },
    accounts: {
      intro:
        "To use the Service, you must create an account using Google or Apple Sign-In. You are responsible for:",
      security: "Maintaining the security of your account credentials",
      activities: "All activities that occur under your account",
      notify: "Notifying us immediately of any unauthorized access",
      age: "You must be at least 16 years old to create an account and use the Service.",
    },
    conduct: {
      intro: "You agree not to:",
      unlawful: "Use the Service for any unlawful purpose",
      harass: "Harass, abuse, or harm other users",
      access:
        "Attempt to gain unauthorized access to the Service or its systems",
      malware: "Transmit malware, viruses, or other malicious code",
      disrupt:
        "Interfere with or disrupt the integrity or performance of the Service",
      privacy: "Violate the privacy of other users",
    },
    content: {
      license:
        "You retain ownership of any content you submit to the Service (shopping lists, expenses, group names, etc.). By submitting content, you grant us a license to use, store, and process that content solely to provide the Service to you.",
      responsibility:
        "You are solely responsible for the content you submit and must ensure it does not violate any laws or third-party rights.",
    },
    termination: {
      delete:
        "You may delete your account at any time through the app settings. We may suspend or terminate your account if you violate these Terms.",
      effect:
        "Upon termination, your right to use the Service will immediately cease. We may retain certain data as required by law or for legitimate business purposes.",
    },
    disclaimer:
      'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
    liability:
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL FLATSBY OR ITS OPERATOR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.",
    changes:
      'We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the new Terms on this page and updating the "Last updated" date. Your continued use of the Service after such changes constitutes acceptance of the new Terms.',
    contact: {
      intro:
        "If you have any questions about these Terms, please contact us at:",
      email: "<strong>Email:</strong> support@flatsby.com",
    },
  },
  privacy: {
    metaTitle: "Privacy Policy - Flatsby",
    metaDescription: "Privacy Policy for Flatsby",
    title: "Privacy Policy",
    lastUpdated: "October 2026",
    toc: {
      introduction: "Introduction",
      controller: "Data Controller",
      collected: "Data We Collect",
      basis: "Legal Basis for Processing",
      use: "How We Use Your Data",
      sharing: "Data Sharing",
      retention: "Data Retention",
      rights: "Your Rights (GDPR)",
      security: "Data Security",
      international: "International Data Transfers",
      children: "Children's Privacy",
      changes: "Changes to This Policy",
      contact: "Contact Us",
      objection: "Your Right to Object",
    },
    introduction:
      'This Privacy Policy explains how Flatsby ("we", "us", "our") collects, uses, and protects your personal data when you use our household management application. We are committed to protecting your privacy and complying with the General Data Protection Regulation (GDPR) and other applicable data protection laws.',
    city: "64291 Darmstadt, Germany",
    emailLine: "Email: support@flatsby.com",
    controller: "The data controller responsible for your personal data is:",
    account: {
      heading: "3.1 Account Information",
      intro: "When you sign up via Google or Apple Sign-In, we receive:",
      name: "Your name",
      email: "Email address",
      picture: "Profile picture (if provided)",
      identifier: "Unique identifier from the authentication provider",
      plan: "Your plan, purchases and AI credit balance",
    },
    userContent: {
      heading: "3.2 User-Generated Content",
      intro: "Data you create while using the app:",
      lists: "Shopping lists and items (names, categories, completion status)",
      expenses:
        "Expenses (amounts, descriptions, dates, categories, split information)",
      groups: "Group information (names, member relationships)",
      chat: "Chat conversations with our AI assistant",
      calendar:
        "Calendar entries and chores (titles, dates, repeat rules, assigned members)",
    },
    technical: {
      heading: "3.3 Technical Data",
      intro: "Automatically collected data varies by platform:",
      website: "Website:",
      websiteIp:
        "IP address and browser user agent (to run the website; when you are not signed in, passed to PostHog only to form a visitor ID that changes daily, see 6.2)",
      websiteViews:
        "Page views, the referring website, campaign tags in links (utm parameters) and clicks on app store links, without cookies",
      mobile: "Mobile App:",
      mobileIp:
        "IP address (PostHog uses it to derive an approximate location, such as country and city, and then discards it)",
      mobileDevice: "Device type, operating system, and app version",
      mobileViews: "Screen views and navigation patterns",
      websiteSession:
        "When you're signed in: the IP address and browser of each login session, stored with the session to protect your account",
      errors:
        "Error reports (web and app): technical details when something fails, such as the affected operation and a stack trace, sent to PostHog. Error messages from the app can occasionally contain content you entered.",
    },
    basis: {
      intro: "We process your personal data based on:",
      contract:
        "<strong>Contract (Art. 6(1)(b) GDPR):</strong> Your account, groups, lists, expenses, calendar and purchases, and automatic categories, which send item names and expense descriptions to an AI model",
      consent:
        "<strong>Consent (Art. 6(1)(a) GDPR):</strong> The AI chat assistant",
      interests:
        "<strong>Legitimate interests (Art. 6(1)(f) GDPR):</strong> Counting website visits and sign-ups per source without cookies, to see where our marketing works; recording what signed-in users do on the web and in the app, to see which features are used and where people get stuck; error reports, to find and fix bugs; AI usage metrics (model, tokens, latency, cost), to keep AI features affordable and reliable; login session records (IP address, browser), to keep your account secure",
      obligations:
        "<strong>Legal obligation (Art. 6(1)(c) GDPR):</strong> Keeping invoices and payment records under tax and commercial law",
      required:
        "No law requires you to give us data. To create an account we need your name, email address and the ID from Google or Apple; without them you can't use Flatsby. Analytics isn't needed to use Flatsby.",
    },
    use: {
      intro: "We use your personal data to:",
      provide: "Provide and maintain the Flatsby service",
      collaborate: "Enable collaboration with your household members",
      display: "Process and display your shopping lists and expenses",
      ai: "Provide AI-powered assistance (when enabled)",
      communications: "Send service-related communications",
      improve: "Improve and optimize the service",
      security: "Ensure security and prevent fraud",
    },
    groups: {
      heading: "6.1 Within Your Groups",
      body: "When you join a household group, other group members can see your name, profile picture, and the content you share within that group (shopping list items, expenses).",
    },
    providers: {
      heading: "6.2 Service Providers",
      intro: "We use third-party services to operate Flatsby:",
      neon: "<strong>Neon (Database):</strong> Stores your data on servers in Frankfurt, Germany",
      vercel:
        "<strong>Vercel Inc., USA (Hosting):</strong> Runs our website and API. Every request to Flatsby passes through Vercel, including your IP address and browser details.",
      auth: "<strong>Google/Apple (Authentication):</strong> Provides sign-in services",
      ai: "<strong>AI Services (Vercel AI Gateway):</strong> AI features are integrated throughout Flatsby (chat assistant, automatic category detection for shopping items, and more). Data is processed via <gateway>Vercel AI Gateway</gateway>, which routes requests to OpenAI (GPT models) or Google (Gemini models). See <dpa>Vercel's privacy policy</dpa>.",
      posthog:
        "<strong>PostHog (Analytics):</strong> Helps us understand how people find and use Flatsby so we can improve it. What is collected depends on how you use Flatsby:",
      posthogWebsite:
        "<strong>Website, when you're not signed in:</strong> For analytics we don't set cookies, don't store anything on your device and don't load a PostHog script. Our server counts each page you open. When you move to another page within the website, a small script on our own domain tells our server the address of the new and the previous page. Our server passes this to PostHog together with what your browser sends with every request: IP address, user agent, referring website and language. PostHog combines IP address, user agent and a random key that is deleted every day into a visitor ID, then discards the IP address and user agent. It stores the visitor ID with the page address (invite codes removed), referring website, campaign tags (utm parameters), browser, operating system, device type and language. It doesn't determine your location. When you sign up, one more event is stored with the same visitor ID so we can count sign-ups per source. We can't recognize you on another day and don't link this data to your account. Legal basis: our legitimate interest in knowing how people find Flatsby (Art. 6(1)(f) GDPR). We believe it doesn't outweigh your interests because no profile is built, you can't be recognized after the day ends, and PostHog stores the data in Frankfurt. Browsers that send a Global Privacy Control or Do Not Track signal aren't counted at all, see Your Right to Object.",
      posthogMobile:
        "<strong>Mobile app:</strong> By default the app also sends usage data directly to PostHog: screen views, device type, operating system, app version, error reports, and once you're signed in your account ID, name and email address. For this, the PostHog library stores a random ID on your device. PostHog receives your IP address with each request, derives an approximate location (country, city) from it and then discards it. On Android, the app also reads the install source reported by Google Play (campaign tags and whether you came through an invite link). Legal basis: our legitimate interest in seeing how the app is used (Art. 6(1)(f) GDPR). You can turn this off in the app settings.",
      posthogAi:
        "AI feature usage analytics (such as which AI model was used, token counts, response latency, and cost) are also tracked via PostHog to help us monitor and improve AI features. No chat messages, prompts, or AI responses are shared with PostHog. PostHog processes data on EU servers. See <link>PostHog's Privacy Policy</link>.",
      billing:
        "<strong>Autumn (web) and RevenueCat (iOS/Android), plans and AI credits:</strong> Manage your plan, purchases and credit balance. Autumn receives your account ID, name and email address, RevenueCat your account ID, and both your purchase history. In the app, purchases are handled by Apple or Google; on the web, Autumn uses Stripe to process payments.",
      expo: "<strong>Expo (app updates):</strong> When the app starts, it checks Expo's servers for updates. Expo receives your IP address and technical data such as app version and platform.",
      stores:
        "<strong>Apple App Store and Google Play:</strong> Distribute the app and handle in-app purchases as separate controllers under their own privacy policies.",
      posthogServer:
        "<strong>When you're signed in (web and app):</strong> Our server sends each action you take, such as adding an item, to PostHog with your account ID, the household group it concerns and how long it took. On the web it also sends each page you open, with your browser, operating system, device type, user agent and the referring page. Your IP address isn't sent. Legal basis: our legitimate interest in seeing how Flatsby is used so we can fix problems and improve it (Art. 6(1)(f) GDPR). You can object at any time, see Your Right to Object.",
    },
    legalRequirements: {
      heading: "6.3 Legal Requirements",
      body: "We may disclose your data if required by law or to protect our rights and safety.",
    },
    aiProcessing: {
      heading: "6.4 AI Data Processing",
      intro:
        "AI features are integrated throughout Flatsby. The following data may be sent to AI providers:",
      names:
        "Shopping list item names and expense descriptions (for automatic category detection)",
      chat: "Chat messages and conversation history (when using the AI assistant)",
      data: "Shopping list and expense data (when using AI assistant tools)",
      members: "Group member names (when AI needs to identify members)",
      outro:
        "Vercel forwards this data to OpenAI or Google, which use it to generate the result.",
    },
    retention: {
      intro:
        "We retain your personal data for as long as your account is active. When you delete your account:",
      personal:
        "Your account, profile and chat conversations are deleted from our database immediately",
      content:
        "Shopping list items and expenses you created may be anonymized but retained for other group members",
      outro:
        "Independently of that: database backups are overwritten after a short restore window. Login sessions, including their IP address and browser, are deleted when you sign out and at the latest with your account. Analytics events in PostHog are deleted after 12 months. The daily key used for website visitor IDs is deleted every day. If you bought a plan, we keep invoices and payment records as long as tax and commercial law requires (up to 10 years).",
    },
    rights: {
      intro: "Under the GDPR, you have the right to:",
      access: "<strong>Access:</strong> Request a copy of your personal data",
      rectification:
        "<strong>Rectification:</strong> Correct inaccurate personal data",
      erasure:
        '<strong>Erasure:</strong> Delete your personal data ("right to be forgotten")',
      restriction:
        "<strong>Restriction:</strong> Restrict processing of your data",
      portability:
        "<strong>Portability:</strong> Receive your data in a machine-readable format",
      object: "<strong>Object:</strong> See Your Right to Object below",
      withdraw:
        "<strong>Withdraw consent:</strong> Withdraw consent at any time for consent-based processing",
      optOut:
        "<strong>Analytics in the app:</strong> You can turn off analytics in the app settings. The app then stops sending usage data to PostHog. Our server still records actions with your account. To stop that too, object as described under Your Right to Object.",
      exercise:
        'To exercise these rights, use the "Export My Data" feature in Settings or contact us at support@flatsby.com. You can also lodge a complaint with a data protection supervisory authority, in particular in the EU member state where you live or work. The authority responsible for us is the Hessian Commissioner for Data Protection and Freedom of Information (HBDI) in Wiesbaden, <link>datenschutz.hessen.de</link>.',
    },
    security: {
      intro:
        "We implement appropriate technical and organizational measures to protect your personal data, including:",
      transit: "Encryption of data in transit (HTTPS/TLS)",
      rest: "Encryption of data at rest",
      oauth: "Secure authentication via OAuth 2.0",
      assessments: "Regular security assessments",
      access: "Access controls and monitoring",
    },
    international:
      "Some of our providers are companies based in the USA: Vercel, OpenAI, Google, Apple, Neon, PostHog, RevenueCat, Autumn, Stripe and Expo. Neon and PostHog store our data in Frankfurt. The European Commission has found that companies certified under the EU-US Data Privacy Framework provide an adequate level of data protection (Art. 45 GDPR). PostHog is certified and has also agreed to the EU Standard Contractual Clauses with us (Art. 46(2)(c) GDPR).",
    children:
      "Flatsby is not intended for children under 16 years of age. We do not knowingly collect personal data from children under 16. If you believe we have collected data from a child, please contact us immediately.",
    changes:
      'We may update this Privacy Policy from time to time. We will notify you of material changes by updating the "Last updated" date and, where appropriate, by additional notice (e.g., in-app notification).',
    contact: {
      intro:
        "For privacy-related questions or to exercise your rights, contact us:",
      email: "<strong>Email:</strong> support@flatsby.com",
    },
    objection: {
      intro:
        "Where we process your data based on our legitimate interests (Art. 6(1)(f) GDPR, see Legal Basis for Processing), you can object at any time for reasons arising from your particular situation (Art. 21 GDPR). For analytics you don't need to give a reason; we will stop.",
      signedIn:
        "<strong>Signed in:</strong> Write to support@flatsby.com from your account's email address. We then stop recording analytics events for your account, on the web and in the app.",
      visitor:
        "<strong>Not signed in:</strong> We can't recognize you, so we can't match an objection by email to your visits. Turn on Global Privacy Control or Do Not Track in your browser instead. We then don't count your visits at all.",
    },
  },
  legalNotice: {
    metaTitle: "Legal Notice - Flatsby",
    metaDescription: "Legal notice for Flatsby as required by German law",
    title: "Legal Notice",
    subtitle: "Information according to §5 DDG (Digitale-Dienste-Gesetz)",
    country: "Germany",
    provider: "Service Provider",
    contact: {
      heading: "Contact",
      phone: "<strong>Phone:</strong> +49 15679 769941",
      email: "<strong>Email:</strong> <link>support@flatsby.com</link>",
    },
    responsible: {
      heading: "Responsible for Content",
      body: "Responsible for content according to §18 Abs. 2 MStV (German Interstate Media Treaty):",
    },
    dispute: {
      heading: "Consumer Dispute Resolution",
      body: "We are neither obligated nor willing to participate in dispute resolution proceedings before a consumer arbitration board.",
    },
    contentLiability: {
      heading: "Liability for Content",
      own: "As a service provider, we are responsible for our own content on these pages in accordance with §7 Abs.1 DDG (Digitale-Dienste-Gesetz). According to §§8 bis 10 DDG, however, we as a service provider are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.",
      removal:
        "Obligations to remove or block the use of information under general law remain unaffected. However, liability in this regard is only possible from the point in time at which we become aware of a specific legal violation. If we become aware of such legal violations, we will remove this content immediately.",
    },
    linkLiability: {
      heading: "Liability for Links",
      external:
        "Our offer contains links to external third-party websites over whose content we have no influence. Therefore, we cannot assume any liability for these external contents. The respective provider or operator of the pages is always responsible for the content of the linked pages. The linked pages were checked for possible legal violations at the time of linking. Illegal content was not recognizable at the time of linking.",
      control:
        "However, permanent content control of the linked pages is not reasonable without concrete evidence of a legal violation. If we become aware of legal violations, we will remove such links immediately.",
    },
    copyright: {
      heading: "Copyright",
      works:
        "The content and works created by the site operators on these pages are subject to German copyright law. Duplication, processing, distribution, and any kind of exploitation outside the limits of copyright require the written consent of the respective author or creator. Downloads and copies of this site are only permitted for private, non-commercial use.",
      thirdParty:
        "Insofar as the content on this site was not created by the operator, the copyrights of third parties are respected. In particular, third-party content is marked as such. Should you nevertheless become aware of a copyright infringement, please inform us accordingly. If we become aware of legal violations, we will remove such content immediately.",
    },
  },
};
