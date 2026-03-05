const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = "ecommerce_sport";

let db;

// -- Definitions des requetes --------------------------------------------------

const queries = [
  // Catalogue
  {
    id: "products-running",
    domain: "Catalogue",
    title: "Produits de running",
    description: "Trouver tous les produits actifs de type running",
    mongoQuery: 'db.products.find({ sport_type: "running", status: "active" })',
    run: () =>
      db
        .collection("products")
        .find({ sport_type: "running", status: "active" })
        .toArray(),
  },
  {
    id: "category-tree",
    domain: "Catalogue",
    title: "Arbre des categories",
    description:
      "Naviguer dans la hierarchie des categories (materialized path)",
    mongoQuery: "db.categories.find().sort({ path: 1 })",
    run: () => db.collection("categories").find().sort({ path: 1 }).toArray(),
  },
  {
    id: "product-by-material",
    domain: "Catalogue",
    title: "Recherche par materiau",
    description: "Produits contenant du mesh dans leurs materiaux",
    mongoQuery: 'db.products.find({ materials: "mesh" })',
    run: () => db.collection("products").find({ materials: "mesh" }).toArray(),
  },
  {
    id: "skus-for-product",
    domain: "Catalogue",
    title: "Variantes d'un produit",
    description:
      "Toutes les SKUs (taille, couleur, prix) du premier produit trouve",
    mongoQuery:
      "db.skus.find({ product_id: <product_id> }).sort({ size: 1, color: 1 })",
    run: async () => {
      const product = await db.collection("products").findOne();
      if (!product) return [];
      return db
        .collection("skus")
        .find({ product_id: product._id })
        .sort({ size: 1, color: 1 })
        .toArray();
    },
  },
  {
    id: "product-with-supplier",
    domain: "Catalogue",
    title: "Produit avec son fournisseur ($lookup)",
    description: "Jointure entre products et suppliers via aggregation",
    mongoQuery: `db.products.aggregate([
  { $lookup: {
      from: "suppliers",
      localField: "supplier_id",
      foreignField: "_id",
      as: "supplier"
  }},
  { $unwind: "$supplier" },
  { $project: {
      name: 1, brand: 1, sport_type: 1,
      "supplier.company_name": 1,
      "supplier.sport_specialties": 1
  }}
])`,
    run: () =>
      db
        .collection("products")
        .aggregate([
          {
            $lookup: {
              from: "suppliers",
              localField: "supplier_id",
              foreignField: "_id",
              as: "supplier",
            },
          },
          { $unwind: "$supplier" },
          {
            $project: {
              name: 1,
              brand: 1,
              sport_type: 1,
              "supplier.company_name": 1,
              "supplier.sport_specialties": 1,
            },
          },
        ])
        .toArray(),
  },

  // Stock
  {
    id: "stock-by-sku",
    domain: "Stock",
    title: "Disponibilite d'un SKU par entrepot",
    description: "Stock disponible du premier SKU dans chaque entrepot",
    mongoQuery: `db.inventory.aggregate([
  { $match: { sku_id: <sku_id> } },
  { $lookup: {
      from: "warehouses",
      localField: "warehouse_id",
      foreignField: "_id",
      as: "warehouse"
  }},
  { $unwind: "$warehouse" },
  { $project: {
      "warehouse.name": 1,
      quantity: 1, reserved_quantity: 1,
      available: { $subtract: ["$quantity", "$reserved_quantity"] }
  }}
])`,
    run: async () => {
      const sku = await db.collection("skus").findOne();
      if (!sku) return [];
      return db
        .collection("inventory")
        .aggregate([
          { $match: { sku_id: sku._id } },
          {
            $lookup: {
              from: "warehouses",
              localField: "warehouse_id",
              foreignField: "_id",
              as: "warehouse",
            },
          },
          { $unwind: "$warehouse" },
          {
            $project: {
              "warehouse.name": 1,
              quantity: 1,
              reserved_quantity: 1,
              available: {
                $subtract: ["$quantity", "$reserved_quantity"],
              },
            },
          },
        ])
        .toArray();
    },
  },
  {
    id: "low-stock",
    domain: "Stock",
    title: "Alertes de reapprovisionnement",
    description: "SKUs dont le stock disponible est sous le seuil de commande",
    mongoQuery: `db.inventory.find({
  $expr: {
    $lte: [
      { $subtract: ["$quantity", "$reserved_quantity"] },
      "$reorder_threshold"
    ]
  }
})`,
    run: () =>
      db
        .collection("inventory")
        .find({
          $expr: {
            $lte: [
              { $subtract: ["$quantity", "$reserved_quantity"] },
              "$reorder_threshold",
            ],
          },
        })
        .toArray(),
  },
  {
    id: "total-stock-per-product",
    domain: "Stock",
    title: "Stock total par produit",
    description:
      "Agregation : stock total disponible par produit, toutes variantes et entrepots confondus",
    mongoQuery: `db.inventory.aggregate([
  { $lookup: { from: "skus", localField: "sku_id", foreignField: "_id", as: "sku" } },
  { $unwind: "$sku" },
  { $group: {
      _id: "$sku.product_id",
      total_quantity: { $sum: "$quantity" },
      total_reserved: { $sum: "$reserved_quantity" }
  }},
  { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
  { $unwind: "$product" },
  { $project: {
      product_name: "$product.name",
      total_quantity: 1,
      total_reserved: 1,
      available: { $subtract: ["$total_quantity", "$total_reserved"] }
  }}
])`,
    run: () =>
      db
        .collection("inventory")
        .aggregate([
          {
            $lookup: {
              from: "skus",
              localField: "sku_id",
              foreignField: "_id",
              as: "sku",
            },
          },
          { $unwind: "$sku" },
          {
            $group: {
              _id: "$sku.product_id",
              total_quantity: { $sum: "$quantity" },
              total_reserved: { $sum: "$reserved_quantity" },
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "_id",
              as: "product",
            },
          },
          { $unwind: "$product" },
          {
            $project: {
              product_name: "$product.name",
              total_quantity: 1,
              total_reserved: 1,
              available: {
                $subtract: ["$total_quantity", "$total_reserved"],
              },
            },
          },
        ])
        .toArray(),
  },

  // Commandes
  {
    id: "user-orders",
    domain: "Commandes",
    title: "Historique commandes d'un utilisateur",
    description: "Toutes les commandes du premier utilisateur, triees par date",
    mongoQuery:
      "db.orders.find({ user_id: <user_id> }).sort({ created_at: -1 })",
    run: async () => {
      const user = await db.collection("users").findOne();
      if (!user) return [];
      return db
        .collection("orders")
        .find({ user_id: user._id })
        .sort({ created_at: -1 })
        .toArray();
    },
  },
  {
    id: "revenue-by-product",
    domain: "Commandes",
    title: "Chiffre d'affaires par produit",
    description:
      "Pipeline d'agregation : CA total genere par chaque produit commande",
    mongoQuery: `db.orders.aggregate([
  { $unwind: "$items" },
  { $group: {
      _id: "$items.product_name",
      total_revenue: {
        $sum: { $multiply: ["$items.price", "$items.quantity"] }
      },
      total_units: { $sum: "$items.quantity" }
  }},
  { $sort: { total_revenue: -1 } }
])`,
    run: () =>
      db
        .collection("orders")
        .aggregate([
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.product_name",
              total_revenue: {
                $sum: { $multiply: ["$items.price", "$items.quantity"] },
              },
              total_units: { $sum: "$items.quantity" },
            },
          },
          { $sort: { total_revenue: -1 } },
        ])
        .toArray(),
  },
  {
    id: "orders-by-status",
    domain: "Commandes",
    title: "Repartition des commandes par statut",
    description: "Nombre de commandes groupees par statut",
    mongoQuery: `db.orders.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])`,
    run: () =>
      db
        .collection("orders")
        .aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray(),
  },

  // Engagement
  {
    id: "product-reviews",
    domain: "Engagement",
    title: "Avis d'un produit avec contexte sportif",
    description: "Avis du premier produit avec le profil du reviewer",
    mongoQuery: `db.reviews.aggregate([
  { $match: { product_id: <product_id> } },
  { $lookup: {
      from: "users",
      localField: "user_id",
      foreignField: "_id",
      as: "user"
  }},
  { $unwind: "$user" },
  { $project: {
      rating: 1, title: 1, comment: 1,
      sport_context: 1, verified_purchase: 1,
      "user.first_name": 1, "user.last_name": 1
  }},
  { $sort: { created_at: -1 } }
])`,
    run: async () => {
      const product = await db.collection("products").findOne();
      if (!product) return [];
      return db
        .collection("reviews")
        .aggregate([
          { $match: { product_id: product._id } },
          {
            $lookup: {
              from: "users",
              localField: "user_id",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: "$user" },
          {
            $project: {
              rating: 1,
              title: 1,
              comment: 1,
              sport_context: 1,
              verified_purchase: 1,
              "user.first_name": 1,
              "user.last_name": 1,
            },
          },
          { $sort: { created_at: -1 } },
        ])
        .toArray();
    },
  },
  {
    id: "active-promotions",
    domain: "Engagement",
    title: "Promotions actives",
    description: "Toutes les promotions actuellement valides",
    mongoQuery: `db.promotions.find({
  status: "active",
  start_date: { $lte: new Date() },
  end_date: { $gte: new Date() }
})`,
    run: () => {
      const now = new Date();
      return db
        .collection("promotions")
        .find({
          status: "active",
          start_date: { $lte: now },
          end_date: { $gte: now },
        })
        .toArray();
    },
  },
  {
    id: "avg-rating-per-sport",
    domain: "Engagement",
    title: "Note moyenne par sport",
    description:
      "Agregation des avis par type de sport avec note moyenne et nombre d'avis",
    mongoQuery: `db.reviews.aggregate([
  { $group: {
      _id: "$sport_context.sport",
      avg_rating: { $avg: "$rating" },
      count: { $sum: 1 }
  }},
  { $sort: { avg_rating: -1 } }
])`,
    run: () =>
      db
        .collection("reviews")
        .aggregate([
          {
            $group: {
              _id: "$sport_context.sport",
              avg_rating: { $avg: "$rating" },
              count: { $sum: 1 },
            },
          },
          { $sort: { avg_rating: -1 } },
        ])
        .toArray(),
  },
];

// -- Live reload (SSE + fs.watch) ----------------------------------------------

const publicDir = path.join(__dirname, "public");
const liveReloadClients = [];

fs.watch(publicDir, { recursive: true }, (_event, filename) => {
  if (!filename) return;
  console.log(`[live-reload] changed: ${filename}`);
  for (const res of liveReloadClients) {
    res.write(`data: ${filename}\n\n`);
  }
});

// -- API -----------------------------------------------------------------------

app.get("/__livereload", (_req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  liveReloadClients.push(res);
  _req.on("close", () => {
    const i = liveReloadClients.indexOf(res);
    if (i !== -1) liveReloadClients.splice(i, 1);
  });
});

app.use(express.static(publicDir));

app.get("/api/queries", (_req, res) => {
  res.json(
    queries.map(({ id, domain, title, description, mongoQuery }) => ({
      id,
      domain,
      title,
      description,
      mongoQuery,
    }))
  );
});

app.get("/api/queries/:id/run", async (req, res) => {
  const query = queries.find((q) => q.id === req.params.id);
  if (!query) return res.status(404).json({ error: "Requete introuvable" });

  try {
    const start = process.hrtime.bigint();
    const result = await query.run();
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;

    res.json({
      id: query.id,
      mongoQuery: query.mongoQuery,
      duration_ms: Math.round(durationMs * 100) / 100,
      count: result.length,
      result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -- Custom query execution ----------------------------------------------------

const ALLOWED_METHODS = [
  "find",
  "findOne",
  "aggregate",
  "countDocuments",
  "distinct",
];

function parseMongoQuery(raw) {
  // Supports: db.<collection>.<method>(<args>)  with optional .sort/.limit/.skip
  const match = raw.match(
    /^db\.(\w+)\.(\w+)\(([\s\S]*)\)(?:\.(sort|limit|skip)\(([\s\S]*?)\))*(?:\.(sort|limit|skip)\(([\s\S]*?)\))*(?:\.(sort|limit|skip)\(([\s\S]*?)\))*$/
  );
  if (!match) return null;

  const collection = match[1];
  const method = match[2];
  if (!ALLOWED_METHODS.includes(method)) return null;

  // Parse main arguments using relaxed JSON (MongoDB shell style)
  let args;
  const argsStr = match[3].trim();
  try {
    args = argsStr ? eval(`([${argsStr}])`) : [];
  } catch {
    return null;
  }

  // Collect chained modifiers (.sort, .limit, .skip)
  const modifiers = [];
  for (let i = 4; i < match.length; i += 3) {
    if (match[i]) {
      try {
        modifiers.push({ name: match[i], arg: eval(`(${match[i + 1]})`) });
      } catch {
        return null;
      }
    }
  }

  return { collection, method, args, modifiers };
}

app.use(express.json());

app.post("/api/custom-query", async (req, res) => {
  const raw = (req.body.query || "").trim();
  if (!raw) return res.status(400).json({ error: "Requete vide" });

  const parsed = parseMongoQuery(raw);
  if (!parsed) {
    return res.status(400).json({
      error:
        "Syntaxe non reconnue. Formats supportes :\n" +
        "  db.<collection>.find({ ... })\n" +
        "  db.<collection>.findOne({ ... })\n" +
        "  db.<collection>.aggregate([ ... ])\n" +
        "  db.<collection>.countDocuments({ ... })\n" +
        "  db.<collection>.distinct(\"field\", { ... })\n" +
        "Modifieurs optionnels : .sort() .limit() .skip()",
    });
  }

  try {
    const start = process.hrtime.bigint();
    const col = db.collection(parsed.collection);
    let cursor = col[parsed.method](...parsed.args);

    // Apply chained modifiers (sort/limit/skip) for find/findOne
    if (cursor && typeof cursor.sort === "function") {
      for (const mod of parsed.modifiers) {
        cursor = cursor[mod.name](mod.arg);
      }
    }

    let result;
    if (cursor && typeof cursor.toArray === "function") {
      result = await cursor.toArray();
    } else {
      result = await cursor;
    }

    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const isArray = Array.isArray(result);

    res.json({
      mongoQuery: raw,
      duration_ms: Math.round(durationMs * 100) / 100,
      count: isArray ? result.length : result != null ? 1 : 0,
      result: isArray ? result : result != null ? [result] : [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -- Start ---------------------------------------------------------------------

async function start() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`Connected to MongoDB (${DB_NAME})`);

  app.listen(PORT, () => {
    console.log(`Query Explorer running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
