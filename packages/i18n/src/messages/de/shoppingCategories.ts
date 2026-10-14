import type { Messages } from "../../messages";

export const shoppingCategories = {
  names: {
    "ai-auto-select": "KI-Auswahl",
    produce: "Obst & Gemüse",
    "meat-seafood": "Fleisch & Fisch",
    dairy: "Milchprodukte",
    bakery: "Backwaren",
    "frozen-foods": "Tiefkühlkost",
    beverages: "Getränke",
    snacks: "Snacks",
    pantry: "Vorräte",
    "personal-care": "Körperpflege",
    household: "Haushalt",
    other: "Sonstiges",
  },
  descriptions: {
    "ai-auto-select": "Die KI wählt die passendste Kategorie für den Artikel",
    produce: "Obst, Gemüse, frische Kräuter",
    "meat-seafood": "Rind, Hähnchen, Schwein, Fisch, Meeresfrüchte",
    dairy: "Milch, Käse, Joghurt, Eier",
    bakery: "Brot, Kuchen, Gebäck, Muffins",
    "frozen-foods": "Fertiggerichte, Pizza, Eis",
    beverages: "Kaffee, Tee, Limo, Saft, Wasser",
    snacks: "Chips, Cracker, Nüsse, Süßigkeiten, Schokolade",
    pantry: "Nudeln, Reis, Müsli, Suppen, Konserven, Soßen",
    "personal-care": "Seife, Lotionen, Deo, Zahnpasta, Zahnseide",
    household: "Küchenrolle, Taschentücher, Reiniger, Haushaltsbedarf",
    other: "Sonstiges",
  },
} satisfies Messages["shoppingCategories"];
