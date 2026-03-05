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
]);

// --- SKUs ---
const skuPeg42 = ObjectId();
const skuPeg43 = ObjectId();
const skuPeg42Blk = ObjectId();
const skuUltra42 = ObjectId();
const skuTeeM = ObjectId();
const skuTeeL = ObjectId();

db.skus.insertMany([
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
]);

// --- Warehouses ---
const whParis = ObjectId();
const whLyon = ObjectId();

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
]);

// --- Inventory ---
db.inventory.insertMany([
  {
    sku_id: skuPeg42,
    warehouse_id: whParis,
    quantity: 50,
    reserved_quantity: 2,
    condition: "new",
    reorder_threshold: 10,
    last_restock_date: new Date("2025-12-01"),
  },
  {
    sku_id: skuPeg43,
    warehouse_id: whParis,
    quantity: 35,
    reserved_quantity: 0,
    condition: "new",
    reorder_threshold: 10,
    last_restock_date: new Date("2025-12-01"),
  },
  {
    sku_id: skuPeg42Blk,
    warehouse_id: whParis,
    quantity: 40,
    reserved_quantity: 1,
    condition: "new",
    reorder_threshold: 10,
    last_restock_date: new Date("2025-11-15"),
  },
  {
    sku_id: skuUltra42,
    warehouse_id: whParis,
    quantity: 25,
    reserved_quantity: 0,
    condition: "new",
    reorder_threshold: 5,
    last_restock_date: new Date("2025-11-20"),
  },
  {
    sku_id: skuUltra42,
    warehouse_id: whLyon,
    quantity: 8,
    reserved_quantity: 1,
    condition: "new",
    reorder_threshold: 3,
    last_restock_date: new Date("2025-12-05"),
  },
  {
    sku_id: skuTeeM,
    warehouse_id: whParis,
    quantity: 100,
    reserved_quantity: 0,
    condition: "new",
    reorder_threshold: 20,
    last_restock_date: new Date("2025-12-10"),
  },
  {
    sku_id: skuTeeL,
    warehouse_id: whParis,
    quantity: 80,
    reserved_quantity: 0,
    condition: "new",
    reorder_threshold: 20,
    last_restock_date: new Date("2025-12-10"),
  },
]);

// --- Users ---
const userAlice = ObjectId();
const userBob = ObjectId();

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
]);

// --- Carts ---
db.carts.insertOne({
  user_id: userBob,
  items: [
    {
      sku_id: skuPeg42Blk,
      product_name: "Nike Air Zoom Pegasus 41",
      size: "42",
      color: "Noir",
      price: 129.99,
      quantity: 1,
    },
  ],
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours
  updated_at: new Date(),
});

// --- Orders ---
const orderAlice1 = ObjectId();

db.orders.insertOne({
  _id: orderAlice1,
  order_number: "ORD-2025-000001",
  user_id: userAlice,
  items: [
    {
      sku_id: skuPeg42,
      product_name: "Nike Air Zoom Pegasus 41",
      size: "42",
      color: "Blanc",
      price: 129.99,
      quantity: 1,
    },
    {
      sku_id: skuTeeM,
      product_name: "Nike Dri-FIT Running Tee",
      size: "M",
      color: "Bleu",
      price: 34.99,
      quantity: 2,
    },
  ],
  shipping_address: {
    label: "Domicile",
    street: "42 Rue des Lilas",
    city: "Paris",
    zip: "75011",
    country: "FR",
  },
  billing_address: {
    label: "Domicile",
    street: "42 Rue des Lilas",
    city: "Paris",
    zip: "75011",
    country: "FR",
  },
  payment: {
    method: "card",
    card_last4: "4242",
    transaction_id: "txn_abc123xyz",
    paid_at: new Date("2025-12-15T10:30:00Z"),
  },
  applied_promotions: [
    {
      code: "HIVER25",
      type: "percentage",
      value: 10,
      discount_amount: 19.99,
    },
  ],
  subtotal: 199.97,
  shipping_cost: 0,
  discount_total: 19.99,
  total: 179.98,
  status: "delivered",
  created_at: new Date("2025-12-15T10:28:00Z"),
});

// --- Reviews ---
db.reviews.insertMany([
  {
    product_id: prodPegasus,
    user_id: userAlice,
    rating: 5,
    title: "Parfaites pour mes sorties quotidiennes",
    comment:
      "Très bon amorti, légères et confortables dès la première sortie. Je les utilise pour mes 10 km quotidiens.",
    image_urls: [],
    sport_context: {
      sport: "running",
      frequency: "daily",
      conditions: "outdoor",
      weather: "all",
    },
    verified_purchase: true,
    created_at: new Date("2025-12-20"),
  },
  {
    product_id: prodPegasus,
    user_id: userBob,
    rating: 4,
    title: "Bon rapport qualité-prix",
    comment:
      "Confortables et réactives. Un peu étroites au début mais ça s'assouplit vite.",
    image_urls: ["https://example.com/reviews/bob-pegasus-1.jpg"],
    sport_context: {
      sport: "running",
      frequency: "weekly",
      conditions: "outdoor",
      weather: "dry",
    },
    verified_purchase: true,
    created_at: new Date("2026-01-05"),
  },
  {
    product_id: prodUltraboost,
    user_id: userAlice,
    rating: 4,
    title: "Semelle Boost incroyable",
    comment:
      "Le confort est au top, surtout sur les longues distances. Le Primeknit respire bien.",
    image_urls: [],
    sport_context: {
      sport: "running",
      frequency: "weekly",
      conditions: "outdoor",
      weather: "all",
    },
    verified_purchase: false,
    created_at: new Date("2026-01-10"),
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
    conditions: {
      min_order_amount: 80,
      eligible_category_ids: [],
      eligible_sport_types: [],
    },
    start_date: new Date("2025-12-01"),
    end_date: new Date("2026-02-28"),
    max_total_uses: 1000,
    max_uses_per_user: 2,
    current_uses: 1,
    status: "active",
    stackable: false,
  },
  {
    code: "BIENVENUE15",
    name: "Offre de bienvenue",
    type: "percentage",
    value: 15,
    max_discount_amount: 30,
    conditions: {
      min_order_amount: 50,
      eligible_category_ids: [],
      eligible_sport_types: [],
      first_order_only: true,
    },
    start_date: new Date("2025-01-01"),
    end_date: new Date("2026-12-31"),
    max_total_uses: null,
    max_uses_per_user: 1,
    current_uses: 0,
    status: "active",
    stackable: false,
  },
  {
    code: null,
    name: "Livraison gratuite running",
    type: "free_shipping",
    value: 0,
    max_discount_amount: null,
    conditions: {
      min_order_amount: 100,
      eligible_category_ids: [catRunning],
      eligible_sport_types: ["running"],
    },
    start_date: new Date("2025-11-01"),
    end_date: new Date("2026-03-31"),
    max_total_uses: null,
    max_uses_per_user: null,
    current_uses: 0,
    status: "active",
    stackable: true,
  },
]);

print("=== Base ecommerce_sport initialisée avec succès ===");
print("Collections : " + db.getCollectionNames().join(", "));
