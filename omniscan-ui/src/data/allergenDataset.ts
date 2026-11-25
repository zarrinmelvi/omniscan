/**
 * Static allergen dataset derived from food.csv (botanical names) and
 * FoodData.csv (allergy classifications). Used by the Add Allergen modal for:
 *   - Autocomplete suggestions (name + scientific name)
 *   - Auto-fill of Scientific name field
 *   - Pre-population of alias/mapping chips
 *
 * Aliases are curated synonyms, common OCR terms, and related species names
 * grouped by allergen family. They map to IngredientMapping.scientific_term
 * rows that the AI/OCR uses when scanning ingredient labels.
 */

export interface AllergenDatasetEntry {
  name: string
  scientificName: string
  aliases: string[]
}

export const ALLERGEN_DATASET: AllergenDatasetEntry[] = [
  // ── Cereals / Gluten ────────────────────────────────────────────────────────
  {
    name: 'Wheat',
    scientificName: 'Triticum aestivum',
    aliases: ['wheat flour', 'semolina', 'durum', 'spelt', 'bulgur', 'farina', 'wheat germ', 'wheat starch', 'wheat bran', 'einkorn', 'emmer', 'kamut', 'wheat protein', 'vital wheat gluten'],
  },
  {
    name: 'Wheat germ',
    scientificName: 'Triticum aestivum',
    aliases: ['wheat germ oil', 'wheat germ extract'],
  },
  {
    name: 'Hard wheat',
    scientificName: 'Triticum durum',
    aliases: ['durum wheat', 'durum semolina', 'pasta wheat'],
  },
  {
    name: 'Spelt',
    scientificName: 'Triticum spelta',
    aliases: ['spelt flour', 'spelt grain', 'dinkel'],
  },
  {
    name: 'Barley',
    scientificName: 'Hordeum vulgare',
    aliases: ['barley malt', 'malt extract', 'malt vinegar', 'barley flour', 'barley starch', 'pearl barley', 'barley syrup'],
  },
  {
    name: 'Rye',
    scientificName: 'Secale cereale',
    aliases: ['rye flour', 'rye grain', 'rye bread', 'rye malt'],
  },
  {
    name: 'Oat',
    scientificName: 'Avena sativa',
    aliases: ['oat flour', 'oatmeal', 'rolled oats', 'oat bran', 'oat starch', 'oat extract', 'oat milk'],
  },
  {
    name: 'Triticale',
    scientificName: 'X Triticosecale rimpaui',
    aliases: ['triticale flour', 'triticale grain'],
  },
  {
    name: 'Common buckwheat',
    scientificName: 'Fagopyrum esculentum',
    aliases: ['buckwheat flour', 'buckwheat groats', 'kasha', 'soba'],
  },
  {
    name: 'Rice',
    scientificName: 'Oryza sativa',
    aliases: ['rice flour', 'rice starch', 'rice bran', 'rice syrup', 'rice protein', 'rice milk', 'glutinous rice', 'rice vinegar'],
  },
  {
    name: 'Corn',
    scientificName: 'Zea mays',
    aliases: ['corn flour', 'corn starch', 'cornmeal', 'corn syrup', 'maize', 'maize starch', 'maize flour', 'popcorn', 'sweet corn', 'corn oil'],
  },

  // ── Legumes / Soy ───────────────────────────────────────────────────────────
  {
    name: 'Soy bean',
    scientificName: 'Glycine max',
    aliases: ['soy', 'soya', 'soybean', 'soy protein', 'soy flour', 'soy milk', 'soy sauce', 'tofu', 'miso', 'tempeh', 'edamame', 'soy lecithin', 'textured soy protein', 'soy isolate', 'soybean oil'],
  },
  {
    name: 'Peanut',
    scientificName: 'Arachis hypogaea',
    aliases: ['groundnut', 'groundnuts', 'monkey nuts', 'peanut butter', 'peanut oil', 'peanut flour', 'arachis oil', 'peanut protein'],
  },
  {
    name: 'Lupin',
    scientificName: 'Lupinus',
    aliases: ['lupin flour', 'lupin seed', 'lupin bean', 'lupine flour', 'lupin protein'],
  },
  {
    name: 'Common bean',
    scientificName: 'Phaseolus vulgaris',
    aliases: ['kidney bean', 'haricot bean', 'navy bean', 'black bean', 'pinto bean', 'borlotti bean', 'cannellini bean', 'french bean'],
  },
  {
    name: 'Chickpea',
    scientificName: 'Cicer arietinum',
    aliases: ['garbanzo', 'garbanzo bean', 'gram flour', 'besan', 'chickpea flour', 'hummus'],
  },
  {
    name: 'Lentils',
    scientificName: 'Lens culinaris',
    aliases: ['red lentil', 'green lentil', 'brown lentil', 'lentil flour', 'dal', 'dhal'],
  },
  {
    name: 'Common pea',
    scientificName: 'Pisum sativum',
    aliases: ['pea protein', 'pea flour', 'pea starch', 'split pea', 'garden pea'],
  },
  {
    name: 'Broad bean',
    scientificName: 'Vicia faba',
    aliases: ['fava bean', 'faba bean', 'field bean', 'horse bean'],
  },

  // ── Tree nuts ───────────────────────────────────────────────────────────────
  {
    name: 'Common walnut',
    scientificName: 'Juglans regia',
    aliases: ['walnut', 'walnut oil', 'walnut extract', 'English walnut'],
  },
  {
    name: 'Common hazelnut',
    scientificName: 'Corylus avellana',
    aliases: ['hazelnut', 'filbert', 'hazelnut oil', 'hazelnut extract', 'cobnut'],
  },
  {
    name: 'Almond',
    scientificName: 'Prunus dulcis',
    aliases: ['almond oil', 'almond flour', 'almond meal', 'almond extract', 'almond milk', 'almond butter', 'sweet almond oil'],
  },
  {
    name: 'Cashew nut',
    scientificName: 'Anacardium occidentale',
    aliases: ['cashew', 'cashew butter', 'cashew oil', 'cashew cream'],
  },
  {
    name: 'Pecan nut',
    scientificName: 'Carya illinoinensis',
    aliases: ['pecan', 'pecan oil'],
  },
  {
    name: 'Pistachio',
    scientificName: 'Pistacia vera',
    aliases: ['pistachio nut', 'pistachio oil'],
  },
  {
    name: 'Brazil nut',
    scientificName: 'Bertholletia excelsa',
    aliases: ['para nut', 'cream nut'],
  },
  {
    name: 'Chestnut',
    scientificName: 'Castanea',
    aliases: ['chestnut flour', 'sweet chestnut', 'marron', 'chestnut extract'],
  },
  {
    name: 'Macadamia nut',
    scientificName: 'Macadamia',
    aliases: ['macadamia', 'queensland nut', 'macadamia oil'],
  },
  {
    name: 'Pine nut',
    scientificName: 'Pinus',
    aliases: ['pignolia', 'pine nut oil', 'pinon nut'],
  },

  // ── Sesame / Seeds ──────────────────────────────────────────────────────────
  {
    name: 'Sesame',
    scientificName: 'Sesamum orientale',
    aliases: ['sesame seed', 'tahini', 'sesame oil', 'gingelly oil', 'til', 'benne seed', 'sesame flour', 'sesame paste'],
  },
  {
    name: 'Sunflower',
    scientificName: 'Helianthus annuus',
    aliases: ['sunflower seed', 'sunflower oil', 'sunflower flour', 'sunflower protein'],
  },
  {
    name: 'Flaxseed',
    scientificName: 'Linum usitatissimum',
    aliases: ['linseed', 'flax oil', 'linseed oil', 'ground flaxseed'],
  },
  {
    name: 'Poppy',
    scientificName: 'Papaver',
    aliases: ['poppy seed', 'poppy seed oil'],
  },

  // ── Mustard ─────────────────────────────────────────────────────────────────
  {
    name: 'White mustard',
    scientificName: 'Sinapis alba',
    aliases: ['mustard', 'mustard seed', 'mustard flour', 'mustard oil', 'mustard powder', 'mustard leaves', 'dijon mustard', 'yellow mustard'],
  },
  {
    name: 'Chinese mustard',
    scientificName: 'Brassica juncea',
    aliases: ['brown mustard', 'Indian mustard', 'oriental mustard'],
  },

  // ── Celery ──────────────────────────────────────────────────────────────────
  {
    name: 'Wild celery',
    scientificName: 'Apium graveolens',
    aliases: ['celery', 'celery seed', 'celery salt', 'celery oil', 'celery extract', 'celeriac'],
  },
  {
    name: 'Celeriac',
    scientificName: 'Apium graveolens var. rapaceum',
    aliases: ['celeriac root', 'turnip-rooted celery', 'knob celery'],
  },
  {
    name: 'Celery stalks',
    scientificName: 'Apium graveolens var. dulce',
    aliases: ['pascal celery', 'stalk celery'],
  },

  // ── Crustaceans / Shellfish ──────────────────────────────────────────────────
  {
    name: 'Shrimp',
    scientificName: 'Caridea',
    aliases: ['prawn', 'shrimp paste', 'dried shrimp', 'shrimp extract', 'shrimp powder', 'krill'],
  },
  {
    name: 'Crab',
    scientificName: 'Brachyura',
    aliases: ['crab meat', 'crab extract', 'crab paste', 'imitation crab', 'surimi'],
  },
  {
    name: 'American lobster',
    scientificName: 'Homarus americanus',
    aliases: ['lobster', 'lobster extract', 'lobster bisque'],
  },
  {
    name: 'Crayfish',
    scientificName: 'Astacidea',
    aliases: ['crawfish', 'crayfish extract'],
  },
  {
    name: 'Spiny lobster',
    scientificName: 'Palinuridae',
    aliases: ['rock lobster', 'langoustine'],
  },

  // ── Molluscs ────────────────────────────────────────────────────────────────
  {
    name: 'Common octopus',
    scientificName: 'Octopus vulgaris',
    aliases: ['octopus', 'octopus extract'],
  },
  {
    name: 'Squid',
    scientificName: 'Teuthida',
    aliases: ['calamari', 'squid ink', 'cuttlefish', 'ika'],
  },
  {
    name: 'Blue mussel',
    scientificName: 'Mytilus edulis',
    aliases: ['mussel', 'mussel extract', 'bivalve'],
  },
  {
    name: 'Eastern oyster',
    scientificName: 'Crassostrea virginica',
    aliases: ['oyster', 'oyster sauce', 'oyster extract'],
  },
  {
    name: 'Scallop',
    scientificName: 'Pectinidae',
    aliases: ['scallop extract', 'bay scallop'],
  },
  {
    name: 'Abalone',
    scientificName: 'Haliotis',
    aliases: ['abalone extract', 'ear shell'],
  },
  {
    name: 'Snail',
    scientificName: 'Gastropoda',
    aliases: ['escargot', 'land snail'],
  },

  // ── Fish ────────────────────────────────────────────────────────────────────
  {
    name: 'Atlantic salmon',
    scientificName: 'Salmo salar',
    aliases: ['salmon', 'smoked salmon', 'salmon oil', 'salmon extract'],
  },
  {
    name: 'Atlantic cod',
    scientificName: 'Gadus morhua',
    aliases: ['cod', 'codfish', 'bacalao', 'salt cod', 'cod liver oil'],
  },
  {
    name: 'Atlantic herring',
    scientificName: 'Clupea harengus harengus',
    aliases: ['herring', 'pickled herring', 'rollmops'],
  },
  {
    name: 'Atlantic mackerel',
    scientificName: 'Scomber scombrus',
    aliases: ['mackerel', 'mackerel fillet'],
  },
  {
    name: 'Northern bluefin tuna',
    scientificName: 'Thunnus thynnus',
    aliases: ['tuna', 'canned tuna', 'albacore', 'skipjack', 'tuna extract'],
  },
  {
    name: 'European anchovy',
    scientificName: 'Engraulis encrasicolus',
    aliases: ['anchovy', 'anchovy paste', 'anchovy extract', 'worcestershire sauce'],
  },
  {
    name: 'Pacific sardine',
    scientificName: 'Sardinops sagax',
    aliases: ['sardine', 'canned sardine', 'sardine oil'],
  },
  {
    name: 'Rainbow trout',
    scientificName: 'Oncorhynchus mykiss',
    aliases: ['trout', 'rainbow trout fillet'],
  },
  {
    name: 'Haddock',
    scientificName: 'Melanogrammus aeglefinus',
    aliases: ['smoked haddock', 'finnan haddie'],
  },
  {
    name: 'Flatfish',
    scientificName: 'Pleuronectiformes',
    aliases: ['halibut', 'plaice', 'flounder', 'sole', 'turbot'],
  },

  // ── Milk / Dairy ────────────────────────────────────────────────────────────
  {
    name: 'Milk (Cow)',
    scientificName: 'Bos taurus',
    aliases: ['milk', 'lactose', 'casein', 'whey', 'butter', 'cream', 'cheese', 'yogurt', 'dairy', 'milk powder', 'skimmed milk', 'buttermilk', 'lactalbumin', 'lactoglobulin', 'milk protein', 'milk solids', 'ghee'],
  },

  // ── Eggs ────────────────────────────────────────────────────────────────────
  {
    name: 'Eggs',
    scientificName: 'Gallus gallus',
    aliases: ['egg', 'egg white', 'egg yolk', 'albumin', 'ovalbumin', 'mayonnaise', 'meringue', 'egg powder', 'dried egg', 'egg lecithin', 'lysozyme'],
  },

  // ── Sulphites ───────────────────────────────────────────────────────────────
  {
    name: 'Sulphur Dioxide / Sulphites',
    scientificName: 'Sulphur dioxide (SO₂)',
    aliases: ['sulfur dioxide', 'SO2', 'sodium sulphite', 'potassium sulphite', 'sodium metabisulphite', 'potassium metabisulphite', 'E220', 'E221', 'E222', 'E223', 'E224', 'E225', 'E226', 'E227', 'E228', 'sulphite', 'sulfite'],
  },

  // ── Fruits (common allergens) ────────────────────────────────────────────────
  {
    name: 'Kiwi',
    scientificName: 'Actinidia chinensis',
    aliases: ['kiwi fruit', 'Chinese gooseberry'],
  },
  {
    name: 'Apple',
    scientificName: 'Malus pumila',
    aliases: ['apple extract', 'apple juice', 'apple pectin', 'malic acid'],
  },
  {
    name: 'Peach',
    scientificName: 'Prunus persica',
    aliases: ['peach extract', 'peach juice'],
  },
  {
    name: 'Strawberry',
    scientificName: 'Fragaria X ananassa',
    aliases: ['strawberry extract', 'strawberry juice'],
  },
  {
    name: 'Banana',
    scientificName: 'Musa acuminata',
    aliases: ['banana extract', 'banana flour'],
  },
  {
    name: 'Avocado',
    scientificName: 'Persea americana',
    aliases: ['avocado oil', 'avocado extract', 'guacamole'],
  },
  {
    name: 'Mango',
    scientificName: 'Mangifera indica',
    aliases: ['mango extract', 'mango powder', 'amchoor'],
  },
  {
    name: 'Papaya',
    scientificName: 'Carica papaya',
    aliases: ['papain', 'papaya extract', 'pawpaw'],
  },
  {
    name: 'Pineapple',
    scientificName: 'Ananas comosus',
    aliases: ['bromelain', 'pineapple extract', 'pineapple juice'],
  },

  // ── Vegetables (common allergens) ────────────────────────────────────────────
  {
    name: 'Garden tomato',
    scientificName: 'Solanum lycopersicum',
    aliases: ['tomato', 'tomato paste', 'tomato extract', 'tomato concentrate', 'tomato powder', 'lycopene'],
  },
  {
    name: 'Potato',
    scientificName: 'Solanum tuberosum',
    aliases: ['potato starch', 'potato flour', 'potato protein', 'modified potato starch'],
  },
  {
    name: 'Carrot',
    scientificName: 'Daucus carota ssp. sativus',
    aliases: ['carrot extract', 'carrot juice', 'carrot powder'],
  },
  {
    name: 'Garlic',
    scientificName: 'Allium sativum',
    aliases: ['garlic powder', 'garlic oil', 'garlic extract', 'garlic salt', 'dried garlic'],
  },
  {
    name: 'Garden onion',
    scientificName: 'Allium cepa',
    aliases: ['onion', 'onion powder', 'onion extract', 'dried onion', 'onion salt'],
  },
  {
    name: 'Spinach',
    scientificName: 'Spinacia oleracea',
    aliases: ['spinach extract', 'spinach powder'],
  },
  {
    name: 'Asparagus',
    scientificName: 'Asparagus officinalis',
    aliases: ['asparagus extract', 'asparagus tips'],
  },

  // ── Spices & Herbs ──────────────────────────────────────────────────────────
  {
    name: 'Ginger',
    scientificName: 'Zingiber officinale',
    aliases: ['ginger powder', 'ground ginger', 'ginger extract', 'ginger oil', 'ginger root'],
  },
  {
    name: 'Coriander',
    scientificName: 'Coriandrum sativum',
    aliases: ['cilantro', 'coriander seed', 'coriander powder', 'dhania'],
  },
  {
    name: 'Cumin',
    scientificName: 'Cuminum cyminum',
    aliases: ['cumin seed', 'ground cumin', 'jeera'],
  },
  {
    name: 'Turmeric',
    scientificName: 'Curcuma longa',
    aliases: ['curcumin', 'turmeric powder', 'haldi'],
  },
  {
    name: 'Pepper (Spice)',
    scientificName: 'Piper nigrum',
    aliases: ['black pepper', 'white pepper', 'pepper extract', 'piperine'],
  },
  {
    name: 'Ceylon cinnamon',
    scientificName: 'Cinnamomum verum',
    aliases: ['cinnamon', 'cinnamon powder', 'cassia', 'cinnamon extract'],
  },
  {
    name: 'Fenugreek',
    scientificName: 'Trigonella foenum-graecum',
    aliases: ['methi', 'fenugreek seed', 'fenugreek powder', 'fenugreek extract'],
  },
  {
    name: 'Cardamom',
    scientificName: 'Elettaria cardamomum',
    aliases: ['cardamom seed', 'green cardamom', 'cardamom extract'],
  },
  {
    name: 'Common sage',
    scientificName: 'Salvia officinalis',
    aliases: ['sage', 'sage extract', 'dried sage'],
  },
  {
    name: 'Common thyme',
    scientificName: 'Thymus vulgaris',
    aliases: ['thyme', 'dried thyme', 'thyme extract'],
  },
  {
    name: 'Common oregano',
    scientificName: 'Origanum vulgare',
    aliases: ['oregano', 'dried oregano', 'marjoram'],
  },
  {
    name: 'Dill',
    scientificName: 'Anethum graveolens',
    aliases: ['dill seed', 'dill weed', 'dill extract'],
  },
  {
    name: 'Parsley',
    scientificName: 'Petroselinum crispum',
    aliases: ['parsley extract', 'dried parsley', 'parsley seed'],
  },
  {
    name: 'Sweet basil',
    scientificName: 'Ocimum basilicum',
    aliases: ['basil', 'dried basil', 'basil extract', 'basil oil'],
  },
  {
    name: 'Fennel',
    scientificName: 'Foeniculum vulgare',
    aliases: ['fennel seed', 'fennel extract', 'anise seed', 'fennel oil'],
  },
  {
    name: 'Caraway',
    scientificName: 'Carum carvi',
    aliases: ['caraway seed', 'caraway oil', 'kümmel'],
  },
  {
    name: 'Star anise',
    scientificName: 'Illicium verum',
    aliases: ['star anise extract', 'anise', 'aniseed'],
  },
  {
    name: 'Cloves',
    scientificName: 'Syzygium aromaticum',
    aliases: ['clove', 'clove oil', 'clove extract', 'eugenol'],
  },
  {
    name: 'Nutmeg',
    scientificName: 'Myristica fragrans',
    aliases: ['mace', 'nutmeg oil', 'nutmeg extract'],
  },
  {
    name: 'Saffron',
    scientificName: 'Crocus sativus',
    aliases: ['saffron extract', 'saffron threads'],
  },
  {
    name: 'Horseradish',
    scientificName: 'Armoracia rusticana',
    aliases: ['horseradish sauce', 'wasabi', 'horseradish extract'],
  },
  {
    name: 'Tarragon',
    scientificName: 'Artemisia dracunculus',
    aliases: ['estragon', 'dried tarragon'],
  },
  {
    name: 'Rosemary',
    scientificName: 'Rosmarinus officinalis',
    aliases: ['rosemary extract', 'dried rosemary', 'rosemary oil'],
  },
  {
    name: 'Lemon grass',
    scientificName: 'Cymbopogon citratus',
    aliases: ['lemongrass', 'lemongrass oil', 'lemongrass extract'],
  },

  // ── Cocoa / Coffee / Tea ────────────────────────────────────────────────────
  {
    name: 'Cocoa bean',
    scientificName: 'Theobroma cacao',
    aliases: ['cocoa', 'cacao', 'chocolate', 'cocoa powder', 'cocoa butter', 'dark chocolate', 'milk chocolate', 'cocoa solids', 'carob'],
  },
  {
    name: 'Arabica coffee',
    scientificName: 'Coffea arabica',
    aliases: ['coffee', 'coffee bean', 'caffeine', 'coffee extract', 'instant coffee', 'espresso'],
  },
  {
    name: 'Tea',
    scientificName: 'Camellia sinensis',
    aliases: ['green tea', 'black tea', 'white tea', 'oolong', 'tea extract', 'tannin', 'catechin'],
  },

  // ── Citrus ──────────────────────────────────────────────────────────────────
  {
    name: 'Lemon',
    scientificName: 'Citrus limon',
    aliases: ['lemon juice', 'lemon zest', 'lemon extract', 'citric acid', 'lemon oil'],
  },
  {
    name: 'Sweet orange',
    scientificName: 'Citrus sinensis',
    aliases: ['orange juice', 'orange extract', 'orange zest', 'orange oil', 'orange peel'],
  },
  {
    name: 'Grapefruit',
    scientificName: 'Citrus X paradisi',
    aliases: ['grapefruit juice', 'grapefruit extract', 'grapefruit seed extract'],
  },
  {
    name: 'Lime',
    scientificName: 'Citrus aurantiifolia',
    aliases: ['lime juice', 'lime zest', 'lime extract'],
  },
  {
    name: 'Mandarin orange (Clementine, Tangerine)',
    scientificName: 'Citrus reticulata',
    aliases: ['mandarin', 'clementine', 'tangerine', 'satsuma'],
  },

  // ── Berries ──────────────────────────────────────────────────────────────────
  {
    name: 'Highbush blueberry',
    scientificName: 'Vaccinium corymbosum',
    aliases: ['blueberry', 'blueberry extract', 'blueberry juice'],
  },
  {
    name: 'Red raspberry',
    scientificName: 'Rubus idaeus',
    aliases: ['raspberry', 'raspberry extract', 'raspberry ketone'],
  },
  {
    name: 'Blackcurrant',
    scientificName: 'Ribes nigrum',
    aliases: ['blackcurrant extract', 'cassis'],
  },

  // ── Animal meats ────────────────────────────────────────────────────────────
  {
    name: 'Chicken (Cock, Hen, Rooster)',
    scientificName: 'Gallus gallus',
    aliases: ['chicken extract', 'chicken broth', 'chicken fat', 'poultry'],
  },
  {
    name: 'Cattle (Beef, Veal)',
    scientificName: 'Bos taurus',
    aliases: ['beef', 'veal', 'beef extract', 'gelatin', 'beef tallow', 'bone broth'],
  },
  {
    name: 'Domestic pig (Piglet, Pork)',
    scientificName: 'Sus scrofa domestica',
    aliases: ['pork', 'pork gelatin', 'lard', 'pork extract', 'ham', 'bacon'],
  },
  {
    name: 'Sheep (Mutton, Lamb)',
    scientificName: 'Ovis aries',
    aliases: ['lamb', 'mutton', 'lamb extract'],
  },

  // ── Yeast / Fermented ───────────────────────────────────────────────────────
  {
    name: 'Beer',
    scientificName: '',
    aliases: ['yeast', 'brewer\'s yeast', 'baker\'s yeast', 'yeast extract', 'autolyzed yeast', 'nutritional yeast', 'marmite'],
  },

  // ── Latex-associated foods ───────────────────────────────────────────────────
  {
    name: 'Custard apple',
    scientificName: 'Annona reticulata',
    aliases: ['latex-associated food'],
  },
]

/**
 * Returns entries whose name starts with the query (case-insensitive),
 * followed by entries whose name contains the query elsewhere.
 * Capped at `limit` results (default 8).
 */
export function searchAllergenDataset(query: string, limit = 8): AllergenDatasetEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const starts: AllergenDatasetEntry[] = []
  const contains: AllergenDatasetEntry[] = []

  for (const entry of ALLERGEN_DATASET) {
    const n = entry.name.toLowerCase()
    if (n.startsWith(q)) starts.push(entry)
    else if (n.includes(q)) contains.push(entry)
    if (starts.length + contains.length >= limit * 2) break
  }

  return [...starts, ...contains].slice(0, limit)
}
