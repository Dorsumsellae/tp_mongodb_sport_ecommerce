// =============================================================
// Initialisation de la base ecommerce_sport
// =============================================================

db = db.getSiblingDB("ecommerce_sport");

// -------------------------------------------------------------
// 1. Création des collections avec validation JSON Schema
// -------------------------------------------------------------

db.createCollection("categories");
db.createCollection("suppliers");
db.createCollection("products");
db.createCollection("skus");
db.createCollection("warehouses");
db.createCollection("inventory");
db.createCollection("users");
db.createCollection("carts");
db.createCollection("orders");
db.createCollection("reviews");
db.createCollection("promotions");

// -------------------------------------------------------------
// 2. Index
// -------------------------------------------------------------

// Catalogue
db.categories.createIndex({ slug: 1 }, { unique: true });
db.categories.createIndex({ path: 1 });

db.products.createIndex({ slug: 1 }, { unique: true });
db.products.createIndex({ category_ids: 1 });
db.products.createIndex({ sport_type: 1 });
db.products.createIndex({ status: 1 });
db.products.createIndex({ supplier_id: 1 });

db.skus.createIndex({ product_id: 1 });
db.skus.createIndex({ sku_code: 1 }, { unique: true });

db.suppliers.createIndex({ status: 1 });

// Stock
db.inventory.createIndex({ sku_id: 1, warehouse_id: 1 }, { unique: true });
db.inventory.createIndex({ condition: 1 });

// Commandes
db.orders.createIndex({ user_id: 1 });
db.orders.createIndex({ order_number: 1 }, { unique: true });
db.orders.createIndex({ status: 1, created_at: -1 });

db.carts.createIndex({ user_id: 1 }, { unique: true });
db.carts.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Engagement
db.reviews.createIndex({ product_id: 1, created_at: -1 });
db.reviews.createIndex({ user_id: 1 });

db.promotions.createIndex({ code: 1 }, { unique: true, sparse: true });
db.promotions.createIndex({ status: 1, start_date: 1, end_date: 1 });

db.users.createIndex({ email: 1 }, { unique: true });

// -------------------------------------------------------------
// 3. Données de seed
// -------------------------------------------------------------

// --- Categories ---
const catSport = ObjectId();
const catRunning = ObjectId();
const catFootball = ObjectId();
const catYoga = ObjectId();
const catChaussures = ObjectId();
const catHauts = ObjectId();

db.categories.insertMany([
  {
    _id: catSport,
    name: "Sport",
    slug: "sport",
    path: "/sport",
    parent_id: null,
    ancestors: [],
    image_url: null,
    sort_order: 0,
    is_active: true,
  },
  {
    _id: catRunning,
    name: "Running",
    slug: "running",
    path: "/sport/running",
    parent_id: catSport,
    ancestors: [catSport],
    image_url: null,
    sort_order: 1,
    is_active: true,
  },
  {
    _id: catFootball,
    name: "Football",
    slug: "football",
    path: "/sport/football",
    parent_id: catSport,
    ancestors: [catSport],
    image_url: null,
    sort_order: 2,
    is_active: true,
  },
  {
    _id: catYoga,
    name: "Yoga",
    slug: "yoga",
    path: "/sport/yoga",
    parent_id: catSport,
    ancestors: [catSport],
    image_url: null,
    sort_order: 3,
    is_active: true,
  },
  {
    _id: catChaussures,
    name: "Chaussures",
    slug: "chaussures-running",
    path: "/sport/running/chaussures",
    parent_id: catRunning,
    ancestors: [catSport, catRunning],
    image_url: null,
    sort_order: 1,
    is_active: true,
  },
  {
    _id: catHauts,
    name: "Hauts",
    slug: "hauts-running",
    path: "/sport/running/hauts",
    parent_id: catRunning,
    ancestors: [catSport, catRunning],
    image_url: null,
    sort_order: 2,
    is_active: true,
  },
]);

// --- Suppliers ---
const supplierNike = ObjectId();
const supplierAdidas = ObjectId();

db.suppliers.insertMany([
  {
    _id: supplierNike,
    company_name: "Nike Europe Distribution",
    contact_name: "Jean Dupont",
    email: "distribution@nike-europe.example.com",
    phone: "+33 1 23 45 67 89",
    address: {
      street: "12 Rue du Commerce",
      city: "Paris",
      zip: "75015",
      country: "FR",
    },
    sport_specialties: ["running", "football", "basketball"],
    status: "active",
  },
  {
    _id: supplierAdidas,
    company_name: "Adidas France SARL",
    contact_name: "Marie Martin",
    email: "supply@adidas-france.example.com",
    phone: "+33 4 56 78 90 12",
    address: {
      street: "8 Avenue du Stade",
      city: "Strasbourg",
      zip: "67000",
      country: "FR",
    },
    sport_specialties: ["running", "football", "yoga"],
    status: "active",
  },
]);

// --- Products ---
const prodPegasus = ObjectId();
const prodUltraboost = ObjectId();
const prodTshirtDri = ObjectId();
const prodPhantom = ObjectId();
const prodPredator = ObjectId();
const prodYogaMat = ObjectId();
const prodLeggingYoga = ObjectId();
const prodWindrunner = ObjectId();

db.products.insertMany([
  {
    _id: prodPegasus,
    name: "Nike Air Zoom Pegasus 41",
    slug: "nike-air-zoom-pegasus-41",
    description:
      "Chaussure de running polyvalente avec amorti Nike Air Zoom pour les sorties quotidiennes.",
    supplier_id: supplierNike,
    category_ids: [catRunning, catChaussures],
    tags: ["amorti", "route", "entrainement"],
    brand: "Nike",
    sport_type: "running",
    gender_target: "unisexe",
    materials: ["mesh", "caoutchouc", "mousse ZoomX"],
    images: [
      "https://example.com/images/pegasus41-1.jpg",
      "https://example.com/images/pegasus41-2.jpg",
    ],
    avg_rating: 4.5,
    review_count: 2,
    status: "active",
  },
  {
    _id: prodUltraboost,
    name: "Adidas Ultraboost Light",
    slug: "adidas-ultraboost-light",
    description:
      "Chaussure de running légère avec semelle Boost pour un retour d'énergie maximal.",
    supplier_id: supplierAdidas,
    category_ids: [catRunning, catChaussures],
    tags: ["léger", "boost", "route"],
    brand: "Adidas",
    sport_type: "running",
    gender_target: "unisexe",
    materials: ["primeknit", "caoutchouc continental", "mousse Boost"],
    images: ["https://example.com/images/ultraboost-1.jpg"],
    avg_rating: 4.2,
    review_count: 1,
    status: "active",
  },
  {
    _id: prodTshirtDri,
    name: "Nike Dri-FIT Running Tee",
    slug: "nike-dri-fit-running-tee",
    description:
      "T-shirt de running respirant avec technologie Dri-FIT pour rester au sec.",
    supplier_id: supplierNike,
    category_ids: [catRunning, catHauts],
    tags: ["respirant", "léger", "dri-fit"],
    brand: "Nike",
    sport_type: "running",
    gender_target: "homme",
    materials: ["polyester", "élasthanne"],
    images: ["https://example.com/images/drifit-tee-1.jpg"],
    avg_rating: 4.0,
    review_count: 0,
    status: "active",
  },
  {
    _id: prodPhantom,
    name: "Nike Phantom GX 2 Elite",
    slug: "nike-phantom-gx2-elite",
    description:
      "Crampons de football haut de gamme avec grip texturé pour un contrôle optimal du ballon.",
    supplier_id: supplierNike,
    category_ids: [catFootball],
    tags: ["crampons", "terrain sec", "contrôle"],
    brand: "Nike",
    sport_type: "football",
    gender_target: "unisexe",
    materials: ["Flyknit", "caoutchouc", "NikeSkin"],
    images: ["https://example.com/images/phantom-gx2-1.jpg"],
    avg_rating: 4.7,
    review_count: 3,
    status: "active",
  },
  {
    _id: prodPredator,
    name: "Adidas Predator Accuracy",
    slug: "adidas-predator-accuracy",
    description:
      "Crampons de football avec zones de frappe en caoutchouc pour une précision maximale.",
    supplier_id: supplierAdidas,
    category_ids: [catFootball],
    tags: ["crampons", "précision", "terrain sec"],
    brand: "Adidas",
    sport_type: "football",
    gender_target: "unisexe",
    materials: ["synthétique", "caoutchouc Gripknit", "Controlskin"],
    images: ["https://example.com/images/predator-accuracy-1.jpg"],
    avg_rating: 4.4,
    review_count: 2,
    status: "active",
  },
  {
    _id: prodYogaMat,
    name: "Adidas Premium Yoga Mat",
    slug: "adidas-premium-yoga-mat",
    description:
      "Tapis de yoga antidérapant haute densité de 5mm pour un confort optimal.",
    supplier_id: supplierAdidas,
    category_ids: [catYoga],
    tags: ["antidérapant", "épais", "écologique"],
    brand: "Adidas",
    sport_type: "yoga",
    gender_target: "unisexe",
    materials: ["caoutchouc naturel", "polyuréthane"],
    images: ["https://example.com/images/yoga-mat-1.jpg"],
    avg_rating: 4.6,
    review_count: 2,
    status: "active",
  },
  {
    _id: prodLeggingYoga,
    name: "Nike Yoga Dri-FIT Legging",
    slug: "nike-yoga-dri-fit-legging",
    description:
      "Legging taille haute avec technologie Dri-FIT pour les sessions de yoga et pilates.",
    supplier_id: supplierNike,
    category_ids: [catYoga],
    tags: ["taille haute", "respirant", "stretch"],
    brand: "Nike",
    sport_type: "yoga",
    gender_target: "femme",
    materials: ["nylon", "élasthanne", "polyester recyclé"],
    images: ["https://example.com/images/yoga-legging-1.jpg"],
    avg_rating: 4.3,
    review_count: 2,
    status: "active",
  },
  {
    _id: prodWindrunner,
    name: "Nike Windrunner Jacket",
    slug: "nike-windrunner-jacket",
    description:
      "Veste coupe-vent légère et compressible, idéale pour les sorties running par temps frais.",
    supplier_id: supplierNike,
    category_ids: [catRunning, catHauts],
    tags: ["coupe-vent", "compressible", "imperméable"],
    brand: "Nike",
    sport_type: "running",
    gender_target: "unisexe",
    materials: ["nylon ripstop", "polyester", "DWR coating"],
    images: ["https://example.com/images/windrunner-1.jpg"],
    avg_rating: 4.1,
    review_count: 1,
    status: "active",
  },
]);

// --- SKUs ---
const skuPeg42 = ObjectId();
const skuPeg43 = ObjectId();
const skuPeg42Blk = ObjectId();
const skuUltra42 = ObjectId();
const skuUltra44 = ObjectId();
const skuTeeM = ObjectId();
const skuTeeL = ObjectId();
const skuPhantom42 = ObjectId();
const skuPhantom43 = ObjectId();
const skuPhantom44 = ObjectId();
const skuPredator42 = ObjectId();
const skuPredator43 = ObjectId();
const skuYogaMatPurple = ObjectId();
const skuYogaMatBlack = ObjectId();
const skuLeggingS = ObjectId();
const skuLeggingM = ObjectId();
const skuLeggingL = ObjectId();
const skuWindrunnerM = ObjectId();
const skuWindrunnerL = ObjectId();

db.skus.insertMany([
  // Pegasus
  {
    _id: skuPeg42,
    product_id: prodPegasus,
    sku_code: "NK-PEG41-WHT-42",
    size: "42",
    color: "Blanc",
    color_hex: "#FFFFFF",
    price: 129.99,
    compare_at_price: null,
    weight_g: 280,
    images: ["https://example.com/images/pegasus41-white-42.jpg"],
    is_active: true,
  },
  {
    _id: skuPeg43,
    product_id: prodPegasus,
    sku_code: "NK-PEG41-WHT-43",
    size: "43",
    color: "Blanc",
    color_hex: "#FFFFFF",
    price: 129.99,
    compare_at_price: null,
    weight_g: 295,
    images: [],
    is_active: true,
  },
  {
    _id: skuPeg42Blk,
    product_id: prodPegasus,
    sku_code: "NK-PEG41-BLK-42",
    size: "42",
    color: "Noir",
    color_hex: "#000000",
    price: 129.99,
    compare_at_price: 149.99,
    weight_g: 280,
    images: ["https://example.com/images/pegasus41-black-42.jpg"],
    is_active: true,
  },
  // Ultraboost
  {
    _id: skuUltra42,
    product_id: prodUltraboost,
    sku_code: "AD-UBL-GRY-42",
    size: "42",
    color: "Gris",
    color_hex: "#808080",
    price: 179.99,
    compare_at_price: 199.99,
    weight_g: 260,
    images: [],
    is_active: true,
  },
  {
    _id: skuUltra44,
    product_id: prodUltraboost,
    sku_code: "AD-UBL-GRY-44",
    size: "44",
    color: "Gris",
    color_hex: "#808080",
    price: 179.99,
    compare_at_price: 199.99,
    weight_g: 275,
    images: [],
    is_active: true,
  },
  // Dri-FIT Tee
  {
    _id: skuTeeM,
    product_id: prodTshirtDri,
    sku_code: "NK-DFT-BLU-M",
    size: "M",
    color: "Bleu",
    color_hex: "#1E90FF",
    price: 34.99,
    compare_at_price: null,
    weight_g: 120,
    images: [],
    is_active: true,
  },
  {
    _id: skuTeeL,
    product_id: prodTshirtDri,
    sku_code: "NK-DFT-BLU-L",
    size: "L",
    color: "Bleu",
    color_hex: "#1E90FF",
    price: 34.99,
    compare_at_price: null,
    weight_g: 130,
    images: [],
    is_active: true,
  },
  // Phantom GX 2
  {
    _id: skuPhantom42,
    product_id: prodPhantom,
    sku_code: "NK-PHG2-WHT-42",
    size: "42",
    color: "Blanc/Orange",
    color_hex: "#FF6B35",
    price: 249.99,
    compare_at_price: null,
    weight_g: 210,
    images: ["https://example.com/images/phantom-gx2-white-42.jpg"],
    is_active: true,
  },
  {
    _id: skuPhantom43,
    product_id: prodPhantom,
    sku_code: "NK-PHG2-WHT-43",
    size: "43",
    color: "Blanc/Orange",
    color_hex: "#FF6B35",
    price: 249.99,
    compare_at_price: null,
    weight_g: 220,
    images: [],
    is_active: true,
  },
  {
    _id: skuPhantom44,
    product_id: prodPhantom,
    sku_code: "NK-PHG2-BLK-44",
    size: "44",
    color: "Noir/Volt",
    color_hex: "#CCFF00",
    price: 249.99,
    compare_at_price: 279.99,
    weight_g: 225,
    images: [],
    is_active: true,
  },
  // Predator
  {
    _id: skuPredator42,
    product_id: prodPredator,
    sku_code: "AD-PRED-BLK-42",
    size: "42",
    color: "Noir/Rouge",
    color_hex: "#FF2D00",
    price: 219.99,
    compare_at_price: null,
    weight_g: 230,
    images: ["https://example.com/images/predator-black-42.jpg"],
    is_active: true,
  },
  {
    _id: skuPredator43,
    product_id: prodPredator,
    sku_code: "AD-PRED-BLK-43",
    size: "43",
    color: "Noir/Rouge",
    color_hex: "#FF2D00",
    price: 219.99,
    compare_at_price: null,
    weight_g: 240,
    images: [],
    is_active: true,
  },
  // Yoga Mat
  {
    _id: skuYogaMatPurple,
    product_id: prodYogaMat,
    sku_code: "AD-YGM-PRP-STD",
    size: "Standard",
    color: "Violet",
    color_hex: "#8B5CF6",
    price: 49.99,
    compare_at_price: null,
    weight_g: 1200,
    images: ["https://example.com/images/yoga-mat-purple.jpg"],
    is_active: true,
  },
  {
    _id: skuYogaMatBlack,
    product_id: prodYogaMat,
    sku_code: "AD-YGM-BLK-STD",
    size: "Standard",
    color: "Noir",
    color_hex: "#1A1A1A",
    price: 49.99,
    compare_at_price: 59.99,
    weight_g: 1200,
    images: [],
    is_active: true,
  },
  // Yoga Legging
  {
    _id: skuLeggingS,
    product_id: prodLeggingYoga,
    sku_code: "NK-YGL-BLK-S",
    size: "S",
    color: "Noir",
    color_hex: "#000000",
    price: 59.99,
    compare_at_price: null,
    weight_g: 180,
    images: ["https://example.com/images/yoga-legging-black-s.jpg"],
    is_active: true,
  },
  {
    _id: skuLeggingM,
    product_id: prodLeggingYoga,
    sku_code: "NK-YGL-BLK-M",
    size: "M",
    color: "Noir",
    color_hex: "#000000",
    price: 59.99,
    compare_at_price: null,
    weight_g: 190,
    images: [],
    is_active: true,
  },
  {
    _id: skuLeggingL,
    product_id: prodLeggingYoga,
    sku_code: "NK-YGL-OLV-L",
    size: "L",
    color: "Olive",
    color_hex: "#556B2F",
    price: 59.99,
    compare_at_price: null,
    weight_g: 200,
    images: [],
    is_active: true,
  },
  // Windrunner
  {
    _id: skuWindrunnerM,
    product_id: prodWindrunner,
    sku_code: "NK-WDR-NVY-M",
    size: "M",
    color: "Bleu marine",
    color_hex: "#1B2A4A",
    price: 89.99,
    compare_at_price: null,
    weight_g: 250,
    images: ["https://example.com/images/windrunner-navy-m.jpg"],
    is_active: true,
  },
  {
    _id: skuWindrunnerL,
    product_id: prodWindrunner,
    sku_code: "NK-WDR-NVY-L",
    size: "L",
    color: "Bleu marine",
    color_hex: "#1B2A4A",
    price: 89.99,
    compare_at_price: null,
    weight_g: 265,
    images: [],
    is_active: true,
  },
]);

// --- Warehouses ---
const whParis = ObjectId();
const whLyon = ObjectId();
const whMarseille = ObjectId();

db.warehouses.insertMany([
  {
    _id: whParis,
    name: "Entrepôt Paris Nord",
    code: "WH-PAR-01",
    address: {
      street: "ZI des Bois, Bât 4",
      city: "Roissy-en-France",
      zip: "95700",
      country: "FR",
    },
    type: "main",
    is_active: true,
  },
  {
    _id: whLyon,
    name: "Point de retrait Lyon",
    code: "WH-LYO-01",
    address: {
      street: "15 Rue de la Part-Dieu",
      city: "Lyon",
      zip: "69003",
      country: "FR",
    },
    type: "pickup_point",
    is_active: true,
  },
  {
    _id: whMarseille,
    name: "Entrepôt Marseille Sud",
    code: "WH-MRS-01",
    address: {
      street: "Zone Logistique des Aygalades",
      city: "Marseille",
      zip: "13015",
      country: "FR",
    },
    type: "regional",
    is_active: true,
  },
]);

// --- Inventory ---
db.inventory.insertMany([
  // Running - Pegasus
  { sku_id: skuPeg42, warehouse_id: whParis, quantity: 50, reserved_quantity: 2, condition: "new", reorder_threshold: 10, last_restock_date: new Date("2025-12-01") },
  { sku_id: skuPeg42, warehouse_id: whMarseille, quantity: 15, reserved_quantity: 0, condition: "new", reorder_threshold: 5, last_restock_date: new Date("2025-12-15") },
  { sku_id: skuPeg43, warehouse_id: whParis, quantity: 35, reserved_quantity: 0, condition: "new", reorder_threshold: 10, last_restock_date: new Date("2025-12-01") },
  { sku_id: skuPeg42Blk, warehouse_id: whParis, quantity: 40, reserved_quantity: 1, condition: "new", reorder_threshold: 10, last_restock_date: new Date("2025-11-15") },
  { sku_id: skuPeg42Blk, warehouse_id: whLyon, quantity: 5, reserved_quantity: 0, condition: "new", reorder_threshold: 3, last_restock_date: new Date("2025-11-20") },
  // Running - Ultraboost
  { sku_id: skuUltra42, warehouse_id: whParis, quantity: 25, reserved_quantity: 0, condition: "new", reorder_threshold: 5, last_restock_date: new Date("2025-11-20") },
  { sku_id: skuUltra42, warehouse_id: whLyon, quantity: 8, reserved_quantity: 1, condition: "new", reorder_threshold: 3, last_restock_date: new Date("2025-12-05") },
  { sku_id: skuUltra44, warehouse_id: whParis, quantity: 12, reserved_quantity: 0, condition: "new", reorder_threshold: 5, last_restock_date: new Date("2025-12-10") },
  // Running - Dri-FIT Tee
  { sku_id: skuTeeM, warehouse_id: whParis, quantity: 100, reserved_quantity: 0, condition: "new", reorder_threshold: 20, last_restock_date: new Date("2025-12-10") },
  { sku_id: skuTeeL, warehouse_id: whParis, quantity: 80, reserved_quantity: 0, condition: "new", reorder_threshold: 20, last_restock_date: new Date("2025-12-10") },
  { sku_id: skuTeeM, warehouse_id: whMarseille, quantity: 30, reserved_quantity: 0, condition: "new", reorder_threshold: 10, last_restock_date: new Date("2025-12-15") },
  // Running - Windrunner
  { sku_id: skuWindrunnerM, warehouse_id: whParis, quantity: 45, reserved_quantity: 1, condition: "new", reorder_threshold: 10, last_restock_date: new Date("2025-12-20") },
  { sku_id: skuWindrunnerL, warehouse_id: whParis, quantity: 38, reserved_quantity: 0, condition: "new", reorder_threshold: 10, last_restock_date: new Date("2025-12-20") },
  // Football - Phantom
  { sku_id: skuPhantom42, warehouse_id: whParis, quantity: 20, reserved_quantity: 3, condition: "new", reorder_threshold: 5, last_restock_date: new Date("2025-12-01") },
  { sku_id: skuPhantom43, warehouse_id: whParis, quantity: 18, reserved_quantity: 0, condition: "new", reorder_threshold: 5, last_restock_date: new Date("2025-12-01") },
  { sku_id: skuPhantom44, warehouse_id: whParis, quantity: 6, reserved_quantity: 2, condition: "new", reorder_threshold: 5, last_restock_date: new Date("2025-11-25") },
  { sku_id: skuPhantom42, warehouse_id: whLyon, quantity: 4, reserved_quantity: 4, condition: "new", reorder_threshold: 3, last_restock_date: new Date("2025-11-10") },
  // Football - Predator
  { sku_id: skuPredator42, warehouse_id: whParis, quantity: 22, reserved_quantity: 0, condition: "new", reorder_threshold: 5, last_restock_date: new Date("2025-12-05") },
  { sku_id: skuPredator43, warehouse_id: whParis, quantity: 15, reserved_quantity: 0, condition: "new", reorder_threshold: 5, last_restock_date: new Date("2025-12-05") },
  { sku_id: skuPredator42, warehouse_id: whMarseille, quantity: 10, reserved_quantity: 1, condition: "new", reorder_threshold: 3, last_restock_date: new Date("2025-12-10") },
  // Yoga - Mat
  { sku_id: skuYogaMatPurple, warehouse_id: whParis, quantity: 60, reserved_quantity: 0, condition: "new", reorder_threshold: 15, last_restock_date: new Date("2025-12-08") },
  { sku_id: skuYogaMatBlack, warehouse_id: whParis, quantity: 45, reserved_quantity: 0, condition: "new", reorder_threshold: 15, last_restock_date: new Date("2025-12-08") },
  { sku_id: skuYogaMatPurple, warehouse_id: whLyon, quantity: 12, reserved_quantity: 0, condition: "new", reorder_threshold: 5, last_restock_date: new Date("2025-12-12") },
  // Yoga - Legging
  { sku_id: skuLeggingS, warehouse_id: whParis, quantity: 55, reserved_quantity: 0, condition: "new", reorder_threshold: 10, last_restock_date: new Date("2025-12-15") },
  { sku_id: skuLeggingM, warehouse_id: whParis, quantity: 50, reserved_quantity: 2, condition: "new", reorder_threshold: 10, last_restock_date: new Date("2025-12-15") },
  { sku_id: skuLeggingL, warehouse_id: whParis, quantity: 40, reserved_quantity: 0, condition: "new", reorder_threshold: 10, last_restock_date: new Date("2025-12-15") },
  // Retours — articles en condition "returned" / "damaged" (entrepôts sans doublon sku+warehouse)
  { sku_id: skuPeg42, warehouse_id: whLyon, quantity: 3, reserved_quantity: 0, condition: "returned", reorder_threshold: 0, last_restock_date: new Date("2026-01-20") },
  { sku_id: skuPhantom42, warehouse_id: whMarseille, quantity: 1, reserved_quantity: 0, condition: "returned", reorder_threshold: 0, last_restock_date: new Date("2026-02-05") },
  { sku_id: skuUltra42, warehouse_id: whMarseille, quantity: 2, reserved_quantity: 0, condition: "damaged", reorder_threshold: 0, last_restock_date: new Date("2026-01-30") },
]);

// --- Users ---
const userAlice = ObjectId();
const userBob = ObjectId();
const userClara = ObjectId();
const userDavid = ObjectId();
const userEmma = ObjectId();

db.users.insertMany([
  {
    _id: userAlice,
    email: "alice.renard@example.com",
    first_name: "Alice",
    last_name: "Renard",
    phone: "+33 6 12 34 56 78",
    addresses: [
      {
        label: "Domicile",
        street: "42 Rue des Lilas",
        city: "Paris",
        zip: "75011",
        country: "FR",
        is_default: true,
      },
      {
        label: "Bureau",
        street: "10 Avenue de la République",
        city: "Paris",
        zip: "75003",
        country: "FR",
        is_default: false,
      },
    ],
    preferred_sports: ["running", "yoga"],
    preferred_sizes: ["38", "M"],
    loyalty_tier: "gold",
    created_at: new Date("2024-03-15"),
  },
  {
    _id: userBob,
    email: "bob.moreau@example.com",
    first_name: "Bob",
    last_name: "Moreau",
    phone: "+33 6 98 76 54 32",
    addresses: [
      {
        label: "Maison",
        street: "7 Impasse du Château",
        city: "Lyon",
        zip: "69005",
        country: "FR",
        is_default: true,
      },
    ],
    preferred_sports: ["running", "football"],
    preferred_sizes: ["42", "L"],
    loyalty_tier: "silver",
    created_at: new Date("2024-06-01"),
  },
  {
    _id: userClara,
    email: "clara.petit@example.com",
    first_name: "Clara",
    last_name: "Petit",
    phone: "+33 6 55 44 33 22",
    addresses: [
      {
        label: "Domicile",
        street: "88 Boulevard de la Libération",
        city: "Marseille",
        zip: "13004",
        country: "FR",
        is_default: true,
      },
    ],
    preferred_sports: ["yoga", "running"],
    preferred_sizes: ["S", "36"],
    loyalty_tier: "gold",
    created_at: new Date("2024-01-20"),
  },
  {
    _id: userDavid,
    email: "david.leroy@example.com",
    first_name: "David",
    last_name: "Leroy",
    phone: "+33 6 77 88 99 00",
    addresses: [
      {
        label: "Maison",
        street: "3 Place Bellecour",
        city: "Lyon",
        zip: "69002",
        country: "FR",
        is_default: true,
      },
      {
        label: "Parents",
        street: "14 Rue Victor Hugo",
        city: "Grenoble",
        zip: "38000",
        country: "FR",
        is_default: false,
      },
    ],
    preferred_sports: ["football"],
    preferred_sizes: ["43", "L"],
    loyalty_tier: "bronze",
    created_at: new Date("2025-02-10"),
  },
  {
    _id: userEmma,
    email: "emma.durand@example.com",
    first_name: "Emma",
    last_name: "Durand",
    phone: "+33 6 11 22 33 44",
    addresses: [
      {
        label: "Domicile",
        street: "5 Rue du Faubourg Saint-Antoine",
        city: "Paris",
        zip: "75012",
        country: "FR",
        is_default: true,
      },
    ],
    preferred_sports: ["running", "yoga"],
    preferred_sizes: ["M", "39"],
    loyalty_tier: "silver",
    created_at: new Date("2024-09-15"),
  },
]);

// --- Carts ---
db.carts.insertMany([
  {
    user_id: userBob,
    items: [
      { sku_id: skuPeg42Blk, product_name: "Nike Air Zoom Pegasus 41", size: "42", color: "Noir", price: 129.99, quantity: 1 },
      { sku_id: skuWindrunnerL, product_name: "Nike Windrunner Jacket", size: "L", color: "Bleu marine", price: 89.99, quantity: 1 },
    ],
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    updated_at: new Date(),
  },
  {
    user_id: userClara,
    items: [
      { sku_id: skuYogaMatPurple, product_name: "Adidas Premium Yoga Mat", size: "Standard", color: "Violet", price: 49.99, quantity: 1 },
      { sku_id: skuLeggingS, product_name: "Nike Yoga Dri-FIT Legging", size: "S", color: "Noir", price: 59.99, quantity: 2 },
    ],
    expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    updated_at: new Date(),
  },
  {
    user_id: userDavid,
    items: [
      { sku_id: skuPhantom43, product_name: "Nike Phantom GX 2 Elite", size: "43", color: "Blanc/Orange", price: 249.99, quantity: 1 },
    ],
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    updated_at: new Date(),
  },
]);

// --- Orders ---
db.orders.insertMany([
  {
    order_number: "ORD-2025-000001",
    user_id: userAlice,
    items: [
      { sku_id: skuPeg42, product_name: "Nike Air Zoom Pegasus 41", size: "42", color: "Blanc", price: 129.99, quantity: 1 },
      { sku_id: skuTeeM, product_name: "Nike Dri-FIT Running Tee", size: "M", color: "Bleu", price: 34.99, quantity: 2 },
    ],
    shipping_address: { label: "Domicile", street: "42 Rue des Lilas", city: "Paris", zip: "75011", country: "FR" },
    billing_address: { label: "Domicile", street: "42 Rue des Lilas", city: "Paris", zip: "75011", country: "FR" },
    payment: { method: "card", card_last4: "4242", transaction_id: "txn_abc123xyz", paid_at: new Date("2025-12-15T10:30:00Z") },
    applied_promotions: [{ code: "HIVER25", type: "percentage", value: 10, discount_amount: 19.99 }],
    subtotal: 199.97,
    shipping_cost: 0,
    discount_total: 19.99,
    total: 179.98,
    status: "delivered",
    created_at: new Date("2025-12-15T10:28:00Z"),
  },
  {
    order_number: "ORD-2025-000002",
    user_id: userAlice,
    items: [
      { sku_id: skuYogaMatPurple, product_name: "Adidas Premium Yoga Mat", size: "Standard", color: "Violet", price: 49.99, quantity: 1 },
      { sku_id: skuLeggingM, product_name: "Nike Yoga Dri-FIT Legging", size: "M", color: "Noir", price: 59.99, quantity: 1 },
    ],
    shipping_address: { label: "Bureau", street: "10 Avenue de la République", city: "Paris", zip: "75003", country: "FR" },
    billing_address: { label: "Domicile", street: "42 Rue des Lilas", city: "Paris", zip: "75011", country: "FR" },
    payment: { method: "card", card_last4: "4242", transaction_id: "txn_def456uvw", paid_at: new Date("2026-01-20T14:15:00Z") },
    applied_promotions: [],
    subtotal: 109.98,
    shipping_cost: 4.99,
    discount_total: 0,
    total: 114.97,
    status: "delivered",
    created_at: new Date("2026-01-20T14:12:00Z"),
  },
  {
    order_number: "ORD-2025-000003",
    user_id: userBob,
    items: [
      { sku_id: skuUltra42, product_name: "Adidas Ultraboost Light", size: "42", color: "Gris", price: 179.99, quantity: 1 },
    ],
    shipping_address: { label: "Maison", street: "7 Impasse du Château", city: "Lyon", zip: "69005", country: "FR" },
    billing_address: { label: "Maison", street: "7 Impasse du Château", city: "Lyon", zip: "69005", country: "FR" },
    payment: { method: "card", card_last4: "8888", transaction_id: "txn_ghi789rst", paid_at: new Date("2026-01-05T09:00:00Z") },
    applied_promotions: [{ code: "HIVER25", type: "percentage", value: 10, discount_amount: 18.00 }],
    subtotal: 179.99,
    shipping_cost: 0,
    discount_total: 18.00,
    total: 161.99,
    status: "delivered",
    created_at: new Date("2026-01-05T08:55:00Z"),
  },
  {
    order_number: "ORD-2026-000004",
    user_id: userClara,
    items: [
      { sku_id: skuLeggingS, product_name: "Nike Yoga Dri-FIT Legging", size: "S", color: "Noir", price: 59.99, quantity: 2 },
      { sku_id: skuYogaMatBlack, product_name: "Adidas Premium Yoga Mat", size: "Standard", color: "Noir", price: 49.99, quantity: 1 },
      { sku_id: skuTeeM, product_name: "Nike Dri-FIT Running Tee", size: "M", color: "Bleu", price: 34.99, quantity: 1 },
    ],
    shipping_address: { label: "Domicile", street: "88 Boulevard de la Libération", city: "Marseille", zip: "13004", country: "FR" },
    billing_address: { label: "Domicile", street: "88 Boulevard de la Libération", city: "Marseille", zip: "13004", country: "FR" },
    payment: { method: "paypal", card_last4: null, transaction_id: "pp_jkl012mno", paid_at: new Date("2026-02-10T16:45:00Z") },
    applied_promotions: [],
    subtotal: 204.96,
    shipping_cost: 0,
    discount_total: 0,
    total: 204.96,
    status: "shipped",
    created_at: new Date("2026-02-10T16:40:00Z"),
  },
  {
    order_number: "ORD-2026-000005",
    user_id: userDavid,
    items: [
      { sku_id: skuPhantom43, product_name: "Nike Phantom GX 2 Elite", size: "43", color: "Blanc/Orange", price: 249.99, quantity: 1 },
      { sku_id: skuPredator43, product_name: "Adidas Predator Accuracy", size: "43", color: "Noir/Rouge", price: 219.99, quantity: 1 },
    ],
    shipping_address: { label: "Maison", street: "3 Place Bellecour", city: "Lyon", zip: "69002", country: "FR" },
    billing_address: { label: "Maison", street: "3 Place Bellecour", city: "Lyon", zip: "69002", country: "FR" },
    payment: { method: "card", card_last4: "5555", transaction_id: "txn_pqr345stu", paid_at: new Date("2026-02-18T11:20:00Z") },
    applied_promotions: [{ code: "BIENVENUE15", type: "percentage", value: 15, discount_amount: 70.50 }],
    subtotal: 469.98,
    shipping_cost: 0,
    discount_total: 70.50,
    total: 399.48,
    status: "confirmed",
    created_at: new Date("2026-02-18T11:15:00Z"),
  },
  {
    order_number: "ORD-2026-000006",
    user_id: userEmma,
    items: [
      { sku_id: skuPeg42, product_name: "Nike Air Zoom Pegasus 41", size: "42", color: "Blanc", price: 129.99, quantity: 1 },
      { sku_id: skuWindrunnerM, product_name: "Nike Windrunner Jacket", size: "M", color: "Bleu marine", price: 89.99, quantity: 1 },
      { sku_id: skuLeggingM, product_name: "Nike Yoga Dri-FIT Legging", size: "M", color: "Noir", price: 59.99, quantity: 1 },
    ],
    shipping_address: { label: "Domicile", street: "5 Rue du Faubourg Saint-Antoine", city: "Paris", zip: "75012", country: "FR" },
    billing_address: { label: "Domicile", street: "5 Rue du Faubourg Saint-Antoine", city: "Paris", zip: "75012", country: "FR" },
    payment: { method: "card", card_last4: "1111", transaction_id: "txn_vwx678yza", paid_at: new Date("2026-02-25T18:30:00Z") },
    applied_promotions: [],
    subtotal: 279.97,
    shipping_cost: 0,
    discount_total: 0,
    total: 279.97,
    status: "processing",
    created_at: new Date("2026-02-25T18:25:00Z"),
  },
  {
    order_number: "ORD-2026-000007",
    user_id: userBob,
    items: [
      { sku_id: skuPhantom42, product_name: "Nike Phantom GX 2 Elite", size: "42", color: "Blanc/Orange", price: 249.99, quantity: 1 },
    ],
    shipping_address: { label: "Maison", street: "7 Impasse du Château", city: "Lyon", zip: "69005", country: "FR" },
    billing_address: { label: "Maison", street: "7 Impasse du Château", city: "Lyon", zip: "69005", country: "FR" },
    payment: { method: "card", card_last4: "8888", transaction_id: "txn_bcd901efg", paid_at: new Date("2026-03-01T10:00:00Z") },
    applied_promotions: [],
    subtotal: 249.99,
    shipping_cost: 4.99,
    discount_total: 0,
    total: 254.98,
    status: "confirmed",
    created_at: new Date("2026-03-01T09:55:00Z"),
  },
]);

// --- Reviews ---
db.reviews.insertMany([
  // Pegasus
  {
    product_id: prodPegasus,
    user_id: userAlice,
    rating: 5,
    title: "Parfaites pour mes sorties quotidiennes",
    comment: "Très bon amorti, légères et confortables dès la première sortie. Je les utilise pour mes 10 km quotidiens.",
    image_urls: [],
    sport_context: { sport: "running", frequency: "daily", conditions: "outdoor", weather: "all" },
    verified_purchase: true,
    created_at: new Date("2025-12-20"),
  },
  {
    product_id: prodPegasus,
    user_id: userBob,
    rating: 4,
    title: "Bon rapport qualité-prix",
    comment: "Confortables et réactives. Un peu étroites au début mais ça s'assouplit vite.",
    image_urls: ["https://example.com/reviews/bob-pegasus-1.jpg"],
    sport_context: { sport: "running", frequency: "weekly", conditions: "outdoor", weather: "dry" },
    verified_purchase: true,
    created_at: new Date("2026-01-05"),
  },
  // Ultraboost
  {
    product_id: prodUltraboost,
    user_id: userAlice,
    rating: 4,
    title: "Semelle Boost incroyable",
    comment: "Le confort est au top, surtout sur les longues distances. Le Primeknit respire bien.",
    image_urls: [],
    sport_context: { sport: "running", frequency: "weekly", conditions: "outdoor", weather: "all" },
    verified_purchase: false,
    created_at: new Date("2026-01-10"),
  },
  // Phantom
  {
    product_id: prodPhantom,
    user_id: userBob,
    rating: 5,
    title: "Contrôle de balle exceptionnel",
    comment: "La texture du dessus donne un toucher de balle incroyable. Parfait pour les milieux de terrain.",
    image_urls: ["https://example.com/reviews/bob-phantom-1.jpg"],
    sport_context: { sport: "football", frequency: "weekly", conditions: "outdoor", weather: "all" },
    verified_purchase: true,
    created_at: new Date("2026-01-15"),
  },
  {
    product_id: prodPhantom,
    user_id: userDavid,
    rating: 5,
    title: "Meilleurs crampons que j'ai eus",
    comment: "Légers, réactifs, excellent grip sur terrain sec. Le Flyknit épouse parfaitement le pied.",
    image_urls: [],
    sport_context: { sport: "football", frequency: "weekly", conditions: "outdoor", weather: "dry" },
    verified_purchase: true,
    created_at: new Date("2026-02-20"),
  },
  {
    product_id: prodPhantom,
    user_id: userEmma,
    rating: 4,
    title: "Très bien mais taillent petit",
    comment: "Super qualité, mais il faut prendre une taille au-dessus. Confort excellent une fois la bonne taille trouvée.",
    image_urls: [],
    sport_context: { sport: "football", frequency: "monthly", conditions: "outdoor", weather: "all" },
    verified_purchase: false,
    created_at: new Date("2026-02-25"),
  },
  // Predator
  {
    product_id: prodPredator,
    user_id: userDavid,
    rating: 4,
    title: "Précision au top",
    comment: "Les zones de frappe en caoutchouc font une vraie différence sur les passes longues et les tirs.",
    image_urls: ["https://example.com/reviews/david-predator-1.jpg"],
    sport_context: { sport: "football", frequency: "weekly", conditions: "outdoor", weather: "all" },
    verified_purchase: true,
    created_at: new Date("2026-02-22"),
  },
  {
    product_id: prodPredator,
    user_id: userBob,
    rating: 5,
    title: "Solides et précis",
    comment: "Après 2 mois d'utilisation intensive, aucun signe d'usure. Excellent maintien de la cheville.",
    image_urls: [],
    sport_context: { sport: "football", frequency: "weekly", conditions: "outdoor", weather: "wet" },
    verified_purchase: true,
    created_at: new Date("2026-03-01"),
  },
  // Yoga Mat
  {
    product_id: prodYogaMat,
    user_id: userClara,
    rating: 5,
    title: "Tapis parfait pour le yoga chaud",
    comment: "Adhérence excellente même en transpirant. Épaisseur idéale pour les genoux. Pas d'odeur chimique.",
    image_urls: [],
    sport_context: { sport: "yoga", frequency: "daily", conditions: "indoor", weather: "all" },
    verified_purchase: true,
    created_at: new Date("2026-01-25"),
  },
  {
    product_id: prodYogaMat,
    user_id: userAlice,
    rating: 4,
    title: "Bonne qualité, un peu lourd",
    comment: "Très bon grip et confort, mais un peu lourd à transporter au studio. Idéal pour la pratique à la maison.",
    image_urls: [],
    sport_context: { sport: "yoga", frequency: "weekly", conditions: "indoor", weather: "all" },
    verified_purchase: true,
    created_at: new Date("2026-02-01"),
  },
  // Yoga Legging
  {
    product_id: prodLeggingYoga,
    user_id: userClara,
    rating: 4,
    title: "Taille haute très confortable",
    comment: "Ne roule pas pendant les inversions. Tissu doux et opaque. La taille est fidèle.",
    image_urls: [],
    sport_context: { sport: "yoga", frequency: "daily", conditions: "indoor", weather: "all" },
    verified_purchase: true,
    created_at: new Date("2026-02-12"),
  },
  {
    product_id: prodLeggingYoga,
    user_id: userEmma,
    rating: 5,
    title: "Mon legging préféré",
    comment: "J'en ai acheté 3 paires. Parfait pour le yoga et aussi pour le quotidien. Ultra stretch.",
    image_urls: ["https://example.com/reviews/emma-legging-1.jpg"],
    sport_context: { sport: "yoga", frequency: "weekly", conditions: "indoor", weather: "all" },
    verified_purchase: true,
    created_at: new Date("2026-02-28"),
  },
  // Windrunner
  {
    product_id: prodWindrunner,
    user_id: userEmma,
    rating: 4,
    title: "Coupe-vent efficace",
    comment: "Légère et compressible. Protège bien du vent et des petites averses. La capuche tient bien.",
    image_urls: [],
    sport_context: { sport: "running", frequency: "weekly", conditions: "outdoor", weather: "wet" },
    verified_purchase: true,
    created_at: new Date("2026-03-02"),
  },
]);

// --- Promotions ---
db.promotions.insertMany([
  {
    code: "HIVER25",
    name: "Soldes d'hiver 2025",
    type: "percentage",
    value: 10,
    max_discount_amount: 50,
    conditions: { min_order_amount: 80, eligible_category_ids: [], eligible_sport_types: [] },
    start_date: new Date("2025-12-01"),
    end_date: new Date("2026-02-28"),
    max_total_uses: 1000,
    max_uses_per_user: 2,
    current_uses: 3,
    status: "active",
    stackable: false,
  },
  {
    code: "BIENVENUE15",
    name: "Offre de bienvenue",
    type: "percentage",
    value: 15,
    max_discount_amount: 30,
    conditions: { min_order_amount: 50, eligible_category_ids: [], eligible_sport_types: [], first_order_only: true },
    start_date: new Date("2025-01-01"),
    end_date: new Date("2026-12-31"),
    max_total_uses: null,
    max_uses_per_user: 1,
    current_uses: 1,
    status: "active",
    stackable: false,
  },
  {
    code: null,
    name: "Livraison gratuite running",
    type: "free_shipping",
    value: 0,
    max_discount_amount: null,
    conditions: { min_order_amount: 100, eligible_category_ids: [catRunning], eligible_sport_types: ["running"] },
    start_date: new Date("2025-11-01"),
    end_date: new Date("2026-03-31"),
    max_total_uses: null,
    max_uses_per_user: null,
    current_uses: 0,
    status: "active",
    stackable: true,
  },
  {
    code: "FOOT20",
    name: "Promo football -20%",
    type: "percentage",
    value: 20,
    max_discount_amount: 80,
    conditions: { min_order_amount: 100, eligible_category_ids: [catFootball], eligible_sport_types: ["football"] },
    start_date: new Date("2026-03-01"),
    end_date: new Date("2026-04-30"),
    max_total_uses: 500,
    max_uses_per_user: 1,
    current_uses: 0,
    status: "active",
    stackable: false,
  },
  {
    code: "YOGA10",
    name: "Remise yoga printemps",
    type: "fixed_amount",
    value: 10,
    max_discount_amount: 10,
    conditions: { min_order_amount: 60, eligible_category_ids: [catYoga], eligible_sport_types: ["yoga"] },
    start_date: new Date("2026-03-15"),
    end_date: new Date("2026-05-31"),
    max_total_uses: 200,
    max_uses_per_user: 1,
    current_uses: 0,
    status: "active",
    stackable: true,
  },
  {
    code: "FLASH50",
    name: "Vente flash -50% (expiree)",
    type: "percentage",
    value: 50,
    max_discount_amount: 100,
    conditions: { min_order_amount: 0, eligible_category_ids: [], eligible_sport_types: [] },
    start_date: new Date("2025-11-29"),
    end_date: new Date("2025-11-29"),
    max_total_uses: 100,
    max_uses_per_user: 1,
    current_uses: 87,
    status: "expired",
    stackable: false,
  },
]);

print("=== Base ecommerce_sport initialisée avec succès ===");
print("Collections : " + db.getCollectionNames().join(", "));
