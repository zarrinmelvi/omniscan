/**
 * food-dataset.ts
 *
 * Static in-memory food/allergen reference dataset, merged from two source files:
 *   - FoodData.csv  (Class / Type / Group / Food / Allergy)
 *   - food.csv      (Common Name / Botanical Name / Category / Sub Category)
 *
 * Where a food appears in both sources the entry uses the botanical name and
 * category from food.csv and the allergyType from FoodData.csv.
 * Duplicate food names (case-insensitive) keep only the first occurrence.
 *
 * Used by the allergen autocomplete endpoint.
 * No imports — pure static data file.
 */

export interface FoodDatasetEntry {
  name: string;         // common food name
  botanicalName: string; // botanical/scientific name (may be empty)
  allergyType: string;  // allergy type (may be empty)
  category: string;     // food category
  subcategory: string;  // food subcategory
}

// ---------------------------------------------------------------------------
// Dataset — 150+ entries
// ---------------------------------------------------------------------------

export const FOOD_DATASET: FoodDatasetEntry[] = [
  // ── Nuts ──────────────────────────────────────────────────────────────────
  {
    name: "Almond",
    botanicalName: "Prunus dulcis",
    allergyType: "Nut Allergy",
    category: "Nuts",
    subcategory: "Nuts",
  },
  {
    name: "Cashew nut",
    botanicalName: "Anacardium occidentale",
    allergyType: "Nut Allergy",
    category: "Nuts",
    subcategory: "Nuts",
  },
  {
    name: "Hazelnut",
    botanicalName: "Corylus avellana",
    allergyType: "Nut Allergy",
    category: "Nuts",
    subcategory: "Nuts",
  },
  {
    name: "Walnut",
    botanicalName: "Juglans regia",
    allergyType: "Nut Allergy",
    category: "Nuts",
    subcategory: "Nuts",
  },
  {
    name: "Pistachio",
    botanicalName: "Pistacia vera",
    allergyType: "Nut Allergy",
    category: "Nuts",
    subcategory: "Nuts",
  },
  {
    name: "Brazil nut",
    botanicalName: "Bertholletia excelsa",
    allergyType: "Nut Allergy",
    category: "Nuts",
    subcategory: "Nuts",
  },
  {
    name: "Macadamia nut",
    botanicalName: "Macadamia integrifolia",
    allergyType: "Nut Allergy",
    category: "Nuts",
    subcategory: "Nuts",
  },
  {
    name: "Pecan",
    botanicalName: "Carya illinoinensis",
    allergyType: "Nut Allergy",
    category: "Nuts",
    subcategory: "Nuts",
  },
  {
    name: "Pine nut",
    botanicalName: "Pinus pinea",
    allergyType: "Nut Allergy",
    category: "Nuts",
    subcategory: "Nuts",
  },
  {
    name: "Chestnut",
    botanicalName: "Castanea sativa",
    allergyType: "Nut Allergy",
    category: "Nuts",
    subcategory: "Nuts",
  },
  {
    name: "Coconut",
    botanicalName: "Cocos nucifera",
    allergyType: "Nut Allergy",
    category: "Nuts",
    subcategory: "Nuts",
  },
  {
    name: "Queensnut",
    botanicalName: "Macadamia tetraphylla",
    allergyType: "Nut Allergy",
    category: "Nuts",
    subcategory: "Nuts",
  },

  // ── Peanut (legume, separate allergy) ─────────────────────────────────────
  {
    name: "Peanut",
    botanicalName: "Arachis hypogaea",
    allergyType: "Peanut Allergy",
    category: "Nuts",
    subcategory: "Nuts",
  },

  // ── Cereals / Gluten ──────────────────────────────────────────────────────
  {
    name: "Common wheat",
    botanicalName: "Triticum aestivum",
    allergyType: "Gluten Allergy",
    category: "Cereals",
    subcategory: "Cereals",
  },
  {
    name: "Wheat",
    botanicalName: "Triticum aestivum",
    allergyType: "Gluten Allergy",
    category: "Cereals",
    subcategory: "Cereals",
  },
  {
    name: "Rye",
    botanicalName: "Secale cereale",
    allergyType: "Gluten Allergy",
    category: "Cereals",
    subcategory: "Cereals",
  },
  {
    name: "Barley",
    botanicalName: "Hordeum vulgare",
    allergyType: "Gluten Allergy",
    category: "Cereals",
    subcategory: "Cereals",
  },
  {
    name: "Oat",
    botanicalName: "Avena sativa",
    allergyType: "Gluten Allergy",
    category: "Cereals",
    subcategory: "Cereals",
  },
  {
    name: "Spelt",
    botanicalName: "Triticum spelta",
    allergyType: "Gluten Allergy",
    category: "Cereals",
    subcategory: "Cereals",
  },
  {
    name: "Kamut",
    botanicalName: "Triticum turgidum ssp. turanicum",
    allergyType: "Gluten Allergy",
    category: "Cereals",
    subcategory: "Cereals",
  },
  {
    name: "Triticale",
    botanicalName: "Triticosecale",
    allergyType: "Gluten Allergy",
    category: "Cereals",
    subcategory: "Cereals",
  },
  {
    name: "Corn",
    botanicalName: "Zea mays",
    allergyType: "Corn Allergy",
    category: "Cereals",
    subcategory: "Cereals",
  },
  {
    name: "Rice",
    botanicalName: "Oryza sativa",
    allergyType: "",
    category: "Cereals",
    subcategory: "Cereals",
  },
  {
    name: "Millet",
    botanicalName: "Panicum miliaceum",
    allergyType: "",
    category: "Cereals",
    subcategory: "Cereals",
  },
  {
    name: "Sorghum",
    botanicalName: "Sorghum bicolor",
    allergyType: "",
    category: "Cereals",
    subcategory: "Cereals",
  },

  // ── Legumes / Soy ─────────────────────────────────────────────────────────
  {
    name: "Soy bean",
    botanicalName: "Glycine max",
    allergyType: "Soy Allergy",
    category: "Soy",
    subcategory: "Soy",
  },
  {
    name: "Soybean",
    botanicalName: "Glycine max",
    allergyType: "Soy Allergy",
    category: "Soy",
    subcategory: "Soy",
  },
  {
    name: "Lupine",
    botanicalName: "Lupinus",
    allergyType: "Lupin Allergy",
    category: "Pulses",
    subcategory: "Other pulses",
  },
  {
    name: "Lupin",
    botanicalName: "Lupinus",
    allergyType: "Lupin Allergy",
    category: "Pulses",
    subcategory: "Other pulses",
  },
  {
    name: "Bean",
    botanicalName: "Phaseolus vulgaris",
    allergyType: "Legume Allergy",
    category: "Pulses",
    subcategory: "Beans",
  },
  {
    name: "Green bean",
    botanicalName: "Phaseolus vulgaris",
    allergyType: "Legume Allergy",
    category: "Pulses",
    subcategory: "Beans",
  },
  {
    name: "Chickpea",
    botanicalName: "Cicer arietinum",
    allergyType: "Legume Allergy",
    category: "Pulses",
    subcategory: "Other pulses",
  },
  {
    name: "Lentil",
    botanicalName: "Lens culinaris",
    allergyType: "Legume Allergy",
    category: "Pulses",
    subcategory: "Other pulses",
  },
  {
    name: "Garden pea",
    botanicalName: "Pisum sativum",
    allergyType: "Legume Allergy",
    category: "Pulses",
    subcategory: "Other pulses",
  },
  {
    name: "Fenugreek",
    botanicalName: "Trigonella foenum-graecum",
    allergyType: "Legume Allergy",
    category: "Herbs and Spices",
    subcategory: "Spices",
  },

  // ── Milk & Dairy ──────────────────────────────────────────────────────────
  {
    name: "Milk (Cow)",
    botanicalName: "",
    allergyType: "Milk allergy / Lactose intolerance",
    category: "Milk and milk products",
    subcategory: "Unfermented milks",
  },
  {
    name: "Milk",
    botanicalName: "",
    allergyType: "Milk allergy / Lactose intolerance",
    category: "Milk and milk products",
    subcategory: "Unfermented milks",
  },
  {
    name: "Butter",
    botanicalName: "",
    allergyType: "Milk allergy / Lactose intolerance",
    category: "Milk and milk products",
    subcategory: "Butter",
  },
  {
    name: "Cheese",
    botanicalName: "",
    allergyType: "Milk allergy / Lactose intolerance",
    category: "Milk and milk products",
    subcategory: "Cheese",
  },
  {
    name: "Cream",
    botanicalName: "",
    allergyType: "Milk allergy / Lactose intolerance",
    category: "Milk and milk products",
    subcategory: "Cream",
  },
  {
    name: "Casein",
    botanicalName: "",
    allergyType: "Milk allergy / Lactose intolerance",
    category: "Milk and milk products",
    subcategory: "Milk proteins",
  },
  {
    name: "Lactose",
    botanicalName: "",
    allergyType: "Lactose Intolerance",
    category: "Milk and milk products",
    subcategory: "Milk sugars",
  },
  {
    name: "Whey",
    botanicalName: "",
    allergyType: "Milk allergy / Lactose intolerance",
    category: "Milk and milk products",
    subcategory: "Milk proteins",
  },
  {
    name: "Yogurt",
    botanicalName: "",
    allergyType: "Milk allergy / Lactose intolerance",
    category: "Milk and milk products",
    subcategory: "Fermented milks",
  },
  {
    name: "Goat milk",
    botanicalName: "",
    allergyType: "Milk allergy / Lactose intolerance",
    category: "Milk and milk products",
    subcategory: "Unfermented milks",
  },
  {
    name: "Sheep milk",
    botanicalName: "",
    allergyType: "Milk allergy / Lactose intolerance",
    category: "Milk and milk products",
    subcategory: "Unfermented milks",
  },

  // ── Eggs ──────────────────────────────────────────────────────────────────
  {
    name: "Eggs",
    botanicalName: "",
    allergyType: "Egg Allergy",
    category: "Eggs",
    subcategory: "Eggs",
  },
  {
    name: "Egg white",
    botanicalName: "",
    allergyType: "Egg Allergy",
    category: "Eggs",
    subcategory: "Eggs",
  },
  {
    name: "Egg yolk",
    botanicalName: "",
    allergyType: "Egg Allergy",
    category: "Eggs",
    subcategory: "Eggs",
  },
  {
    name: "Duck egg",
    botanicalName: "",
    allergyType: "Poultry Allergy",
    category: "Eggs",
    subcategory: "Eggs",
  },

  // ── Fish ──────────────────────────────────────────────────────────────────
  {
    name: "Cod",
    botanicalName: "Gadus morhua",
    allergyType: "Fish Allergy",
    category: "Fish",
    subcategory: "Marine fish",
  },
  {
    name: "Salmon",
    botanicalName: "Salmo salar",
    allergyType: "Fish Allergy",
    category: "Fish",
    subcategory: "Marine fish",
  },
  {
    name: "Tuna",
    botanicalName: "Thunnus",
    allergyType: "Fish Allergy",
    category: "Fish",
    subcategory: "Marine fish",
  },
  {
    name: "Mackerel",
    botanicalName: "Scomber scombrus",
    allergyType: "Fish Allergy",
    category: "Fish",
    subcategory: "Marine fish",
  },
  {
    name: "Halibut",
    botanicalName: "Hippoglossus hippoglossus",
    allergyType: "Fish Allergy",
    category: "Fish",
    subcategory: "Marine fish",
  },
  {
    name: "Herring",
    botanicalName: "Clupea harengus",
    allergyType: "Fish Allergy",
    category: "Fish",
    subcategory: "Marine fish",
  },
  {
    name: "Sardine",
    botanicalName: "Sardina pilchardus",
    allergyType: "Fish Allergy",
    category: "Fish",
    subcategory: "Marine fish",
  },
  {
    name: "Anchovy",
    botanicalName: "Engraulis encrasicolus",
    allergyType: "Fish Allergy",
    category: "Fish",
    subcategory: "Marine fish",
  },
  {
    name: "Trout",
    botanicalName: "Oncorhynchus mykiss",
    allergyType: "Fish Allergy",
    category: "Fish",
    subcategory: "Freshwater fish",
  },
  {
    name: "Tilapia",
    botanicalName: "Oreochromis niloticus",
    allergyType: "Fish Allergy",
    category: "Fish",
    subcategory: "Freshwater fish",
  },
  {
    name: "Catfish",
    botanicalName: "Silurus glanis",
    allergyType: "Fish Allergy",
    category: "Fish",
    subcategory: "Freshwater fish",
  },
  {
    name: "Bass",
    botanicalName: "Dicentrarchus labrax",
    allergyType: "Fish Allergy",
    category: "Fish",
    subcategory: "Marine fish",
  },
  {
    name: "Swordfish",
    botanicalName: "Xiphias gladius",
    allergyType: "Fish Allergy",
    category: "Fish",
    subcategory: "Marine fish",
  },

  // ── Shellfish / Crustaceans / Molluscs ────────────────────────────────────
  {
    name: "Crustaceans",
    botanicalName: "",
    allergyType: "Shellfish Allergy",
    category: "Seafood",
    subcategory: "Crustaceans",
  },
  {
    name: "Shrimp",
    botanicalName: "Penaeus monodon",
    allergyType: "Shellfish Allergy",
    category: "Seafood",
    subcategory: "Crustaceans",
  },
  {
    name: "Prawn",
    botanicalName: "Penaeus vannamei",
    allergyType: "Shellfish Allergy",
    category: "Seafood",
    subcategory: "Crustaceans",
  },
  {
    name: "Crab",
    botanicalName: "Portunus trituberculatus",
    allergyType: "Shellfish Allergy",
    category: "Seafood",
    subcategory: "Crustaceans",
  },
  {
    name: "Lobster",
    botanicalName: "Homarus americanus",
    allergyType: "Shellfish Allergy",
    category: "Seafood",
    subcategory: "Crustaceans",
  },
  {
    name: "Oyster",
    botanicalName: "Crassostrea gigas",
    allergyType: "Shellfish Allergy",
    category: "Seafood",
    subcategory: "Molluscs",
  },
  {
    name: "Mussel",
    botanicalName: "Mytilus edulis",
    allergyType: "Shellfish Allergy",
    category: "Seafood",
    subcategory: "Molluscs",
  },
  {
    name: "Clam",
    botanicalName: "Mercenaria mercenaria",
    allergyType: "Shellfish Allergy",
    category: "Seafood",
    subcategory: "Molluscs",
  },
  {
    name: "Squid",
    botanicalName: "Loligo vulgaris",
    allergyType: "Shellfish Allergy",
    category: "Seafood",
    subcategory: "Molluscs",
  },
  {
    name: "Octopus",
    botanicalName: "Octopus vulgaris",
    allergyType: "Shellfish Allergy",
    category: "Seafood",
    subcategory: "Molluscs",
  },
  {
    name: "Scallop",
    botanicalName: "Pecten maximus",
    allergyType: "Shellfish Allergy",
    category: "Seafood",
    subcategory: "Molluscs",
  },

  // ── Seeds ─────────────────────────────────────────────────────────────────
  {
    name: "Sesame",
    botanicalName: "Sesamum orientale",
    allergyType: "Seed Allergy",
    category: "Herbs and Spices",
    subcategory: "Oilseed crops",
  },
  {
    name: "Sesame seed",
    botanicalName: "Sesamum indicum",
    allergyType: "Seed Allergy",
    category: "Herbs and Spices",
    subcategory: "Oilseed crops",
  },
  {
    name: "Sunflower seed",
    botanicalName: "Helianthus annuus",
    allergyType: "Seed Allergy",
    category: "Herbs and Spices",
    subcategory: "Oilseed crops",
  },
  {
    name: "Poppy seed",
    botanicalName: "Papaver somniferum",
    allergyType: "Seed Allergy",
    category: "Herbs and Spices",
    subcategory: "Oilseed crops",
  },
  {
    name: "Flaxseed",
    botanicalName: "Linum usitatissimum",
    allergyType: "Seed Allergy",
    category: "Herbs and Spices",
    subcategory: "Oilseed crops",
  },
  {
    name: "Hemp seed",
    botanicalName: "Cannabis sativa",
    allergyType: "Seed Allergy",
    category: "Herbs and Spices",
    subcategory: "Oilseed crops",
  },
  {
    name: "Chia seed",
    botanicalName: "Salvia hispanica",
    allergyType: "Seed Allergy",
    category: "Herbs and Spices",
    subcategory: "Oilseed crops",
  },

  // ── Fruits ────────────────────────────────────────────────────────────────
  {
    name: "Apple",
    botanicalName: "Malus domestica",
    allergyType: "Oral Allergy Syndrome",
    category: "Fruits",
    subcategory: "Pome fruits",
  },
  {
    name: "Pear",
    botanicalName: "Pyrus communis",
    allergyType: "Oral Allergy Syndrome",
    category: "Fruits",
    subcategory: "Pome fruits",
  },
  {
    name: "Apricot",
    botanicalName: "Prunus armeniaca",
    allergyType: "Stone Fruit Allergy",
    category: "Fruits",
    subcategory: "Stone fruits",
  },
  {
    name: "Peach",
    botanicalName: "Prunus persica",
    allergyType: "Stone Fruit Allergy",
    category: "Fruits",
    subcategory: "Stone fruits",
  },
  {
    name: "Cherry",
    botanicalName: "Prunus avium",
    allergyType: "Stone Fruit Allergy",
    category: "Fruits",
    subcategory: "Stone fruits",
  },
  {
    name: "Plum",
    botanicalName: "Prunus domestica",
    allergyType: "Stone Fruit Allergy",
    category: "Fruits",
    subcategory: "Stone fruits",
  },
  {
    name: "Kiwi",
    botanicalName: "Actinidia deliciosa",
    allergyType: "Oral Allergy Syndrome",
    category: "Fruits",
    subcategory: "Tropical fruits",
  },
  {
    name: "Banana",
    botanicalName: "Musa acuminata",
    allergyType: "Latex-fruit Syndrome",
    category: "Fruits",
    subcategory: "Tropical fruits",
  },
  {
    name: "Avocado",
    botanicalName: "Persea americana",
    allergyType: "Latex-fruit Syndrome",
    category: "Fruits",
    subcategory: "Tropical fruits",
  },
  {
    name: "Lemon",
    botanicalName: "Citrus limon",
    allergyType: "Citrus Allergy",
    category: "Fruits",
    subcategory: "Citrus fruits",
  },
  {
    name: "Orange",
    botanicalName: "Citrus sinensis",
    allergyType: "Citrus Allergy",
    category: "Fruits",
    subcategory: "Citrus fruits",
  },
  {
    name: "Grapefruit",
    botanicalName: "Citrus paradisi",
    allergyType: "Citrus Allergy",
    category: "Fruits",
    subcategory: "Citrus fruits",
  },
  {
    name: "Lime",
    botanicalName: "Citrus aurantiifolia",
    allergyType: "Citrus Allergy",
    category: "Fruits",
    subcategory: "Citrus fruits",
  },
  {
    name: "Strawberry",
    botanicalName: "Fragaria ananassa",
    allergyType: "Oral Allergy Syndrome",
    category: "Fruits",
    subcategory: "Berries",
  },
  {
    name: "Raspberry",
    botanicalName: "Rubus idaeus",
    allergyType: "Oral Allergy Syndrome",
    category: "Fruits",
    subcategory: "Berries",
  },
  {
    name: "Blueberry",
    botanicalName: "Vaccinium myrtillus",
    allergyType: "Oral Allergy Syndrome",
    category: "Fruits",
    subcategory: "Berries",
  },
  {
    name: "Grape",
    botanicalName: "Vitis vinifera",
    allergyType: "Oral Allergy Syndrome",
    category: "Fruits",
    subcategory: "Vine fruits",
  },
  {
    name: "Mango",
    botanicalName: "Mangifera indica",
    allergyType: "Oral Allergy Syndrome",
    category: "Fruits",
    subcategory: "Tropical fruits",
  },
  {
    name: "Papaya",
    botanicalName: "Carica papaya",
    allergyType: "Latex-fruit Syndrome",
    category: "Fruits",
    subcategory: "Tropical fruits",
  },
  {
    name: "Pineapple",
    botanicalName: "Ananas comosus",
    allergyType: "Oral Allergy Syndrome",
    category: "Fruits",
    subcategory: "Tropical fruits",
  },
  {
    name: "Fig",
    botanicalName: "Ficus carica",
    allergyType: "Latex-fruit Syndrome",
    category: "Fruits",
    subcategory: "Tropical fruits",
  },
  {
    name: "Pomegranate",
    botanicalName: "Punica granatum",
    allergyType: "Oral Allergy Syndrome",
    category: "Fruits",
    subcategory: "Tropical fruits",
  },

  // ── Vegetables ────────────────────────────────────────────────────────────
  {
    name: "Celery",
    botanicalName: "Apium graveolens",
    allergyType: "Hypersensitivity",
    category: "Vegetables",
    subcategory: "Stalk vegetables",
  },
  {
    name: "Carrot",
    botanicalName: "Daucus carota",
    allergyType: "Oral Allergy Syndrome",
    category: "Vegetables",
    subcategory: "Root vegetables",
  },
  {
    name: "Parsnip",
    botanicalName: "Pastinaca sativa",
    allergyType: "Oral Allergy Syndrome",
    category: "Vegetables",
    subcategory: "Root vegetables",
  },
  {
    name: "Tomato",
    botanicalName: "Solanum lycopersicum",
    allergyType: "Oral Allergy Syndrome",
    category: "Vegetables",
    subcategory: "Fruit vegetables",
  },
  {
    name: "Potato",
    botanicalName: "Solanum tuberosum",
    allergyType: "Oral Allergy Syndrome",
    category: "Vegetables",
    subcategory: "Root vegetables",
  },
  {
    name: "Sweet pepper",
    botanicalName: "Capsicum annuum",
    allergyType: "Oral Allergy Syndrome",
    category: "Vegetables",
    subcategory: "Fruit vegetables",
  },
  {
    name: "Broccoli",
    botanicalName: "Brassica oleracea var. italica",
    allergyType: "Oral Allergy Syndrome",
    category: "Vegetables",
    subcategory: "Brassica vegetables",
  },
  {
    name: "Cabbage",
    botanicalName: "Brassica oleracea var. capitata",
    allergyType: "Oral Allergy Syndrome",
    category: "Vegetables",
    subcategory: "Brassica vegetables",
  },
  {
    name: "Cauliflower",
    botanicalName: "Brassica oleracea var. botrytis",
    allergyType: "Oral Allergy Syndrome",
    category: "Vegetables",
    subcategory: "Brassica vegetables",
  },
  {
    name: "Spinach",
    botanicalName: "Spinacia oleracea",
    allergyType: "",
    category: "Vegetables",
    subcategory: "Leafy vegetables",
  },
  {
    name: "Lettuce",
    botanicalName: "Lactuca sativa",
    allergyType: "",
    category: "Vegetables",
    subcategory: "Leafy vegetables",
  },
  {
    name: "Cucumber",
    botanicalName: "Cucumis sativus",
    allergyType: "Oral Allergy Syndrome",
    category: "Vegetables",
    subcategory: "Fruit vegetables",
  },
  {
    name: "Zucchini",
    botanicalName: "Cucurbita pepo",
    allergyType: "Oral Allergy Syndrome",
    category: "Vegetables",
    subcategory: "Fruit vegetables",
  },

  // ── Allium (garlic, onion, etc.) ──────────────────────────────────────────
  {
    name: "Garlic",
    botanicalName: "Allium sativum",
    allergyType: "Allium Allergy",
    category: "Vegetables",
    subcategory: "Alliums",
  },
  {
    name: "Onion",
    botanicalName: "Allium cepa",
    allergyType: "Allium Allergy",
    category: "Vegetables",
    subcategory: "Alliums",
  },
  {
    name: "Leek",
    botanicalName: "Allium ampeloprasum",
    allergyType: "Allium Allergy",
    category: "Vegetables",
    subcategory: "Alliums",
  },
  {
    name: "Chives",
    botanicalName: "Allium schoenoprasum",
    allergyType: "Allium Allergy",
    category: "Herbs and Spices",
    subcategory: "Herbs",
  },

  // ── Herbs & Spices ────────────────────────────────────────────────────────
  {
    name: "Mustard",
    botanicalName: "Sinapis alba",
    allergyType: "Mustard Allergy",
    category: "Herbs and Spices",
    subcategory: "Spices",
  },
  {
    name: "Coriander",
    botanicalName: "Coriandrum sativum",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Spices",
  },
  {
    name: "Caraway",
    botanicalName: "Carum carvi",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Spices",
  },
  {
    name: "Anise",
    botanicalName: "Pimpinella anisum",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Spices",
  },
  {
    name: "Fennel",
    botanicalName: "Foeniculum vulgare",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Spices",
  },
  {
    name: "Dill",
    botanicalName: "Anethum graveolens",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Herbs",
  },
  {
    name: "Parsley",
    botanicalName: "Petroselinum crispum",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Herbs",
  },
  {
    name: "Basil",
    botanicalName: "Ocimum basilicum",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Herbs",
  },
  {
    name: "Thyme",
    botanicalName: "Thymus vulgaris",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Herbs",
  },
  {
    name: "Oregano",
    botanicalName: "Origanum vulgare",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Herbs",
  },
  {
    name: "Rosemary",
    botanicalName: "Salvia rosmarinus",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Herbs",
  },
  {
    name: "Sage",
    botanicalName: "Salvia officinalis",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Herbs",
  },

  // ── Sulfites ──────────────────────────────────────────────────────────────
  {
    name: "Sulphur dioxide",
    botanicalName: "",
    allergyType: "Sulfite Sensitivity",
    category: "Food additives",
    subcategory: "Preservatives",
  },
  {
    name: "Wine",
    botanicalName: "Vitis vinifera",
    allergyType: "Sulfite Sensitivity",
    category: "Beverages",
    subcategory: "Fermented beverages",
  },
  {
    name: "Dried fruit",
    botanicalName: "",
    allergyType: "Sulfite Sensitivity",
    category: "Fruits",
    subcategory: "Processed fruits",
  },
  {
    name: "Vinegar",
    botanicalName: "",
    allergyType: "Sulfite Sensitivity",
    category: "Condiments",
    subcategory: "Acids",
  },

  // ── Honey & Bee products ──────────────────────────────────────────────────
  {
    name: "Honey",
    botanicalName: "",
    allergyType: "Honey Allergy",
    category: "Sweeteners",
    subcategory: "Natural sweeteners",
  },
  {
    name: "Royal jelly",
    botanicalName: "",
    allergyType: "Honey Allergy",
    category: "Sweeteners",
    subcategory: "Natural sweeteners",
  },
  {
    name: "Propolis",
    botanicalName: "",
    allergyType: "Honey Allergy",
    category: "Supplements",
    subcategory: "Bee products",
  },

  // ── Meat & Poultry ────────────────────────────────────────────────────────
  {
    name: "Chicken",
    botanicalName: "",
    allergyType: "Poultry Allergy",
    category: "Meat",
    subcategory: "Poultry",
  },
  {
    name: "Turkey",
    botanicalName: "",
    allergyType: "Poultry Allergy",
    category: "Meat",
    subcategory: "Poultry",
  },
  {
    name: "Duck",
    botanicalName: "",
    allergyType: "Poultry Allergy",
    category: "Meat",
    subcategory: "Poultry",
  },
  {
    name: "Beef",
    botanicalName: "",
    allergyType: "Red Meat Allergy",
    category: "Meat",
    subcategory: "Red meat",
  },
  {
    name: "Pork",
    botanicalName: "",
    allergyType: "Red Meat Allergy",
    category: "Meat",
    subcategory: "Red meat",
  },
  {
    name: "Lamb",
    botanicalName: "",
    allergyType: "Red Meat Allergy",
    category: "Meat",
    subcategory: "Red meat",
  },

  // ── Cocoa & Coffee ────────────────────────────────────────────────────────
  {
    name: "Cocoa",
    botanicalName: "Theobroma cacao",
    allergyType: "Hypersensitivity",
    category: "Confectionery",
    subcategory: "Cocoa products",
  },
  {
    name: "Chocolate",
    botanicalName: "Theobroma cacao",
    allergyType: "Hypersensitivity",
    category: "Confectionery",
    subcategory: "Cocoa products",
  },
  {
    name: "Coffee",
    botanicalName: "Coffea arabica",
    allergyType: "Hypersensitivity",
    category: "Beverages",
    subcategory: "Hot beverages",
  },

  // ── Alcohol & Fermented ───────────────────────────────────────────────────
  {
    name: "Beer",
    botanicalName: "",
    allergyType: "Gluten Allergy",
    category: "Beverages",
    subcategory: "Fermented beverages",
  },

  // ── Starchy roots ─────────────────────────────────────────────────────────
  {
    name: "Cassava",
    botanicalName: "Manihot esculenta",
    allergyType: "",
    category: "Vegetables",
    subcategory: "Root vegetables",
  },
  {
    name: "Sweet potato",
    botanicalName: "Ipomoea batatas",
    allergyType: "",
    category: "Vegetables",
    subcategory: "Root vegetables",
  },
  {
    name: "Yam",
    botanicalName: "Dioscorea alata",
    allergyType: "",
    category: "Vegetables",
    subcategory: "Root vegetables",
  },

  // ── Other allergy-relevant foods ──────────────────────────────────────────
  {
    name: "Buckwheat",
    botanicalName: "Fagopyrum esculentum",
    allergyType: "Hypersensitivity",
    category: "Cereals",
    subcategory: "Pseudo-cereals",
  },
  {
    name: "Quinoa",
    botanicalName: "Chenopodium quinoa",
    allergyType: "Hypersensitivity",
    category: "Cereals",
    subcategory: "Pseudo-cereals",
  },
  {
    name: "Amaranth",
    botanicalName: "Amaranthus cruentus",
    allergyType: "Hypersensitivity",
    category: "Cereals",
    subcategory: "Pseudo-cereals",
  },
  {
    name: "Gelatin",
    botanicalName: "",
    allergyType: "Red Meat Allergy",
    category: "Food additives",
    subcategory: "Thickeners",
  },
  {
    name: "Carmine",
    botanicalName: "",
    allergyType: "Hypersensitivity",
    category: "Food additives",
    subcategory: "Colorants",
  },
  {
    name: "Annatto",
    botanicalName: "Bixa orellana",
    allergyType: "Hypersensitivity",
    category: "Food additives",
    subcategory: "Colorants",
  },
  {
    name: "Guar gum",
    botanicalName: "Cyamopsis tetragonoloba",
    allergyType: "Hypersensitivity",
    category: "Food additives",
    subcategory: "Thickeners",
  },
  {
    name: "Carob",
    botanicalName: "Ceratonia siliqua",
    allergyType: "Legume Allergy",
    category: "Pulses",
    subcategory: "Other pulses",
  },
  {
    name: "Tamarind",
    botanicalName: "Tamarindus indica",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Spices",
  },
  {
    name: "Paprika",
    botanicalName: "Capsicum annuum",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Spices",
  },
  {
    name: "Cumin",
    botanicalName: "Cuminum cyminum",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Spices",
  },
  {
    name: "Turmeric",
    botanicalName: "Curcuma longa",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Spices",
  },
  {
    name: "Ginger",
    botanicalName: "Zingiber officinale",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Spices",
  },
  {
    name: "Cinnamon",
    botanicalName: "Cinnamomum verum",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Spices",
  },
  {
    name: "Clove",
    botanicalName: "Syzygium aromaticum",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Spices",
  },
  {
    name: "Nutmeg",
    botanicalName: "Myristica fragrans",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Spices",
  },
  {
    name: "Vanilla",
    botanicalName: "Vanilla planifolia",
    allergyType: "Hypersensitivity",
    category: "Herbs and Spices",
    subcategory: "Spices",
  },
];

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Case-insensitive search across `name` and `botanicalName`.
 * Returns up to `limit` matching entries (default 8).
 */
export function searchFoodDataset(
  q: string,
  limit: number = 8
): FoodDatasetEntry[] {
  if (!q || q.trim() === "") return [];
  const lower = q.toLowerCase();
  const results: FoodDatasetEntry[] = [];
  for (const entry of FOOD_DATASET) {
    if (
      entry.name.toLowerCase().includes(lower) ||
      entry.botanicalName.toLowerCase().includes(lower)
    ) {
      results.push(entry);
      if (results.length >= limit) break;
    }
  }
  return results;
}

/**
 * Returns the first entry whose `name` matches exactly (case-insensitive),
 * or `undefined` if no match is found.
 */
export function getFoodByName(name: string): FoodDatasetEntry | undefined {
  const lower = name.toLowerCase();
  return FOOD_DATASET.find((entry) => entry.name.toLowerCase() === lower);
}
