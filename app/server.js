const express = require("express");
const { MongoClient, ObjectId: _ObjectId } = require("mongodb");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = "ecommerce_sport";

let db;
let knownCollections = [];

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
  // -- Ecriture : Panier
  {
    id: "create-cart",
    domain: "Ecriture",
    title: "Creer un panier",
    description: "Inserer un nouveau panier avec deux articles pour Alice",
    mongoQuery: `db.carts.insertOne({
  user_id: ObjectId("<user_id>"),
  items: [
    {
      sku_id: ObjectId("<sku_id>"),
      product_name: "Nike Air Zoom Pegasus 41",
      size: "42", color: "Blanc",
      price: 129.99, quantity: 1
    },
    {
      sku_id: ObjectId("<sku_id>"),
      product_name: "Nike Dri-FIT Running Tee",
      size: "M", color: "Bleu",
      price: 34.99, quantity: 2
    }
  ],
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  updated_at: new Date()
})`,
    run: async () => {
      const user = await db.collection("users").findOne({ email: "alice.renard@example.com" });
      const skuShoe = await db.collection("skus").findOne({ sku_code: "NK-PEG41-WHT-42" });
      const skuTee = await db.collection("skus").findOne({ sku_code: "NK-DFT-BLU-M" });
      // Remove existing cart for this user first (unique index)
      await db.collection("carts").deleteMany({ user_id: user._id });
      const result = await db.collection("carts").insertOne({
        user_id: user._id,
        items: [
          { sku_id: skuShoe._id, product_name: "Nike Air Zoom Pegasus 41", size: "42", color: "Blanc", price: 129.99, quantity: 1 },
          { sku_id: skuTee._id, product_name: "Nike Dri-FIT Running Tee", size: "M", color: "Bleu", price: 34.99, quantity: 2 },
        ],
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        updated_at: new Date(),
      });
      return [{ acknowledged: result.acknowledged, insertedId: result.insertedId }];
    },
  },
  {
    id: "add-item-to-cart",
    domain: "Ecriture",
    title: "Ajouter un article au panier",
    description: "Ajouter un nouvel article au panier existant avec $push",
    mongoQuery: `db.carts.updateOne(
  { user_id: ObjectId("<user_id>") },
  {
    $push: {
      items: {
        sku_id: ObjectId("<sku_id>"),
        product_name: "Adidas Ultraboost Light",
        size: "42", color: "Gris",
        price: 179.99, quantity: 1
      }
    },
    $set: { updated_at: new Date() }
  }
)`,
    run: async () => {
      const user = await db.collection("users").findOne({ email: "alice.renard@example.com" });
      const sku = await db.collection("skus").findOne({ sku_code: "AD-UBL-GRY-42" });
      const result = await db.collection("carts").updateOne(
        { user_id: user._id },
        {
          $push: {
            items: { sku_id: sku._id, product_name: "Adidas Ultraboost Light", size: "42", color: "Gris", price: 179.99, quantity: 1 },
          },
          $set: { updated_at: new Date() },
        }
      );
      return [{ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }];
    },
  },
  {
    id: "update-cart-quantity",
    domain: "Ecriture",
    title: "Modifier la quantite d'un article",
    description: "Incrementer la quantite d'un article du panier avec $ positional et $inc",
    mongoQuery: `db.carts.updateOne(
  { user_id: ObjectId("<user_id>"), "items.product_name": "Nike Dri-FIT Running Tee" },
  { $inc: { "items.$.quantity": 1 }, $set: { updated_at: new Date() } }
)`,
    run: async () => {
      const user = await db.collection("users").findOne({ email: "alice.renard@example.com" });
      const result = await db.collection("carts").updateOne(
        { user_id: user._id, "items.product_name": "Nike Dri-FIT Running Tee" },
        { $inc: { "items.$.quantity": 1 }, $set: { updated_at: new Date() } }
      );
      return [{ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }];
    },
  },
  {
    id: "remove-item-from-cart",
    domain: "Ecriture",
    title: "Supprimer un article du panier",
    description: "Retirer un article du panier avec $pull",
    mongoQuery: `db.carts.updateOne(
  { user_id: ObjectId("<user_id>") },
  {
    $pull: { items: { product_name: "Adidas Ultraboost Light" } },
    $set: { updated_at: new Date() }
  }
)`,
    run: async () => {
      const user = await db.collection("users").findOne({ email: "alice.renard@example.com" });
      const result = await db.collection("carts").updateOne(
        { user_id: user._id },
        {
          $pull: { items: { product_name: "Adidas Ultraboost Light" } },
          $set: { updated_at: new Date() },
        }
      );
      return [{ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }];
    },
  },

  // -- Ecriture : Commande
  {
    id: "create-order",
    domain: "Ecriture",
    title: "Creer une commande",
    description: "Transformer le panier d'Alice en commande avec snapshot des donnees",
    mongoQuery: `db.orders.insertOne({
  order_number: "ORD-2026-000002",
  user_id: ObjectId("<user_id>"),
  items: [ /* copie depuis le panier */ ],
  shipping_address: { /* snapshot adresse */ },
  billing_address: { /* snapshot adresse */ },
  payment: {
    method: "card", card_last4: "1234",
    transaction_id: "txn_demo_002",
    paid_at: new Date()
  },
  applied_promotions: [],
  subtotal: 199.97,
  shipping_cost: 4.99,
  discount_total: 0,
  total: 204.96,
  status: "confirmed",
  created_at: new Date()
})`,
    run: async () => {
      const user = await db.collection("users").findOne({ email: "alice.renard@example.com" });
      const cart = await db.collection("carts").findOne({ user_id: user._id });
      const items = cart ? cart.items : [];
      const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
      // Clean up previous demo order if exists
      await db.collection("orders").deleteOne({ order_number: "ORD-2026-000002" });
      const result = await db.collection("orders").insertOne({
        order_number: "ORD-2026-000002",
        user_id: user._id,
        items,
        shipping_address: user.addresses[0],
        billing_address: user.addresses[0],
        payment: { method: "card", card_last4: "1234", transaction_id: "txn_demo_002", paid_at: new Date() },
        applied_promotions: [],
        subtotal: Math.round(subtotal * 100) / 100,
        shipping_cost: 4.99,
        discount_total: 0,
        total: Math.round((subtotal + 4.99) * 100) / 100,
        status: "confirmed",
        created_at: new Date(),
      });
      return [{ acknowledged: result.acknowledged, insertedId: result.insertedId }];
    },
  },
  {
    id: "update-order-status",
    domain: "Ecriture",
    title: "Mettre a jour le statut d'une commande",
    description: "Passer une commande de 'confirmed' a 'shipped'",
    mongoQuery: `db.orders.findOneAndUpdate(
  { order_number: "ORD-2026-000002" },
  { $set: { status: "shipped" } },
  { returnDocument: "after" }
)`,
    run: async () => {
      const result = await db.collection("orders").findOneAndUpdate(
        { order_number: "ORD-2026-000002" },
        { $set: { status: "shipped" } },
        { returnDocument: "after" }
      );
      return result ? [result] : [{ message: "Commande ORD-2026-000002 introuvable. Lancez d'abord 'Creer une commande'." }];
    },
  },

  // -- Ecriture : Utilisateur & Avis
  {
    id: "add-user-address",
    domain: "Ecriture",
    title: "Ajouter une adresse utilisateur",
    description: "Ajouter une nouvelle adresse au tableau addresses[] avec $push",
    mongoQuery: `db.users.updateOne(
  { email: "bob.moreau@example.com" },
  {
    $push: {
      addresses: {
        label: "Bureau",
        street: "25 Rue de la Bourse",
        city: "Lyon", zip: "69002", country: "FR",
        is_default: false
      }
    }
  }
)`,
    run: async () => {
      const result = await db.collection("users").updateOne(
        { email: "bob.moreau@example.com" },
        {
          $push: {
            addresses: {
              label: "Bureau",
              street: "25 Rue de la Bourse",
              city: "Lyon", zip: "69002", country: "FR",
              is_default: false,
            },
          },
        }
      );
      return [{ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }];
    },
  },
  {
    id: "create-review",
    domain: "Ecriture",
    title: "Deposer un avis produit",
    description: "Inserer un avis et mettre a jour la note moyenne du produit ($inc + recalcul)",
    mongoQuery: `db.reviews.insertOne({
  product_id: ObjectId("<product_id>"),
  user_id: ObjectId("<user_id>"),
  rating: 5,
  title: "Indispensable pour l'ete",
  comment: "Tres respirant, parfait pour les sorties par temps chaud.",
  image_urls: [],
  sport_context: {
    sport: "running", frequency: "daily",
    conditions: "outdoor", weather: "hot"
  },
  verified_purchase: true,
  created_at: new Date()
})`,
    run: async () => {
      const product = await db.collection("products").findOne({ slug: "nike-dri-fit-running-tee" });
      const user = await db.collection("users").findOne({ email: "bob.moreau@example.com" });
      const review = {
        product_id: product._id,
        user_id: user._id,
        rating: 5,
        title: "Indispensable pour l'ete",
        comment: "Tres respirant, parfait pour les sorties par temps chaud.",
        image_urls: [],
        sport_context: { sport: "running", frequency: "daily", conditions: "outdoor", weather: "hot" },
        verified_purchase: true,
        created_at: new Date(),
      };
      const insertResult = await db.collection("reviews").insertOne(review);
      // Update denormalized rating on product
      const allReviews = await db.collection("reviews").find({ product_id: product._id }).toArray();
      const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
      await db.collection("products").updateOne(
        { _id: product._id },
        { $set: { avg_rating: Math.round(avg * 10) / 10, review_count: allReviews.length } }
      );
      return [{
        acknowledged: insertResult.acknowledged,
        insertedId: insertResult.insertedId,
        updated_product: { avg_rating: Math.round(avg * 10) / 10, review_count: allReviews.length },
      }];
    },
  },

  // -- Ecriture : Stock
  {
    id: "restock-inventory",
    domain: "Ecriture",
    title: "Reapprovisionner un SKU",
    description: "Ajouter du stock avec $inc et mettre a jour la date de reapprovisionnement",
    mongoQuery: `db.inventory.updateOne(
  { sku_id: ObjectId("<sku_id>"), warehouse_id: ObjectId("<warehouse_id>") },
  {
    $inc: { quantity: 50 },
    $set: { last_restock_date: new Date() }
  }
)`,
    run: async () => {
      const sku = await db.collection("skus").findOne({ sku_code: "NK-PEG41-WHT-42" });
      const wh = await db.collection("warehouses").findOne({ code: "WH-PAR-01" });
      const result = await db.collection("inventory").updateOne(
        { sku_id: sku._id, warehouse_id: wh._id },
        { $inc: { quantity: 50 }, $set: { last_restock_date: new Date() } }
      );
      return [{ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }];
    },
  },
  {
    id: "delete-demo-order",
    domain: "Ecriture",
    title: "Supprimer la commande de demo",
    description: "Nettoyer la commande de demo creee par les exemples precedents",
    mongoQuery: `db.orders.deleteOne({ order_number: "ORD-2026-000002" })`,
    run: async () => {
      const result = await db.collection("orders").deleteOne({ order_number: "ORD-2026-000002" });
      return [{ deletedCount: result.deletedCount }];
    },
  },

  // -- Scenario Louis : Achat du Nike Air Zoom Pegasus 41
  {
    id: "louis-step1-check-stock",
    domain: "Scenario Louis",
    title: "Etape 1 - Verifier le stock disponible",
    description: "Louis verifie qu'il reste du stock taille 42 pour le Nike Air Zoom Pegasus 41",
    mongoQuery: `db.inventory.aggregate([
  { $lookup: { from: "skus", localField: "sku_id", foreignField: "_id", as: "sku" } },
  { $unwind: "$sku" },
  { $match: { "sku.sku_code": "NK-PEG41-WHT-42" } },
  { $project: {
      "sku.sku_code": 1, "sku.size": 1, "sku.color": 1,
      quantity: 1, reserved_quantity: 1,
      available: { $subtract: ["$quantity", "$reserved_quantity"] }
  }}
])`,
    run: async () => {
      return db.collection("inventory").aggregate([
        { $lookup: { from: "skus", localField: "sku_id", foreignField: "_id", as: "sku" } },
        { $unwind: "$sku" },
        { $match: { "sku.sku_code": "NK-PEG41-WHT-42" } },
        {
          $project: {
            "sku.sku_code": 1, "sku.size": 1, "sku.color": 1,
            quantity: 1, reserved_quantity: 1,
            available: { $subtract: ["$quantity", "$reserved_quantity"] },
          },
        },
      ]).toArray();
    },
  },
  {
    id: "louis-step2-reserve-stock",
    domain: "Scenario Louis",
    title: "Etape 2 - Reserver le stock (achat)",
    description: "Louis achete 1 paire taille 42 : on incremente reserved_quantity de +1 si stock disponible",
    mongoQuery: `db.inventory.updateOne(
  {
    sku_id: "69aa91177afdb8d18c8563c1",
    $expr: { $gt: [{ $subtract: ["$quantity", "$reserved_quantity"] }, 0] }
  },
  {
    $inc: { reserved_quantity: 1 },
    $set: { updated_at: new Date() }
  }
)`,
    run: async () => {
      const sku = await db.collection("skus").findOne({ sku_code: "NK-PEG41-WHT-42" });
      if (!sku) return [{ message: "SKU NK-PEG41-WHT-42 introuvable." }];
      const result = await db.collection("inventory").updateOne(
        {
          sku_id: sku._id,
          $expr: { $gt: [{ $subtract: ["$quantity", "$reserved_quantity"] }, 0] },
        },
        {
          $inc: { reserved_quantity: 1 },
          $set: { updated_at: new Date() },
        }
      );
      if (result.matchedCount === 0) {
        return [{ message: "Stock insuffisant — commande impossible." }];
      }
      return [{ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, message: "Stock reserve avec succes." }];
    },
  },
  {
    id: "louis-step3-create-order",
    domain: "Scenario Louis",
    title: "Etape 3 - Creer la commande de Louis",
    description: "Insertion de la commande avec snapshot du produit, prix et adresse au moment de l'achat",
    mongoQuery: `db.orders.insertOne({
  order_number: "ORD-LOUIS-001",
  user_id: <user_id_louis>,
  items: [{
    product_id: "69aa91177afdb8d18c8563b9",
    product_name: "Nike Air Zoom Pegasus 41",
    sku_code: "NK-PEG41-WHT-42",
    size: "42", color: "Blanc",
    price: 129.99, quantity: 1
  }],
  subtotal: 129.99,
  shipping_cost: 4.99,
  discount_total: 0,
  total: 134.98,
  status: "confirmed",
  created_at: new Date()
})`,
    run: async () => {
      const user = await db.collection("users").findOne();
      const sku = await db.collection("skus").findOne({ sku_code: "NK-PEG41-WHT-42" });
      // Nettoyage si la demo a deja ete lancee
      await db.collection("orders").deleteOne({ order_number: "ORD-LOUIS-001" });
      const result = await db.collection("orders").insertOne({
        order_number: "ORD-LOUIS-001",
        user_id: user._id,
        items: [{
          product_id: "69aa91177afdb8d18c8563b9",
          product_name: "Nike Air Zoom Pegasus 41",
          sku_code: "NK-PEG41-WHT-42",
          size: "42",
          color: "Blanc",
          price: 129.99,
          quantity: 1,
        }],
        shipping_address: user.addresses ? user.addresses[0] : {},
        subtotal: 129.99,
        shipping_cost: 4.99,
        discount_total: 0,
        total: 134.98,
        status: "confirmed",
        created_at: new Date(),
      });
      return [{
        acknowledged: result.acknowledged,
        insertedId: result.insertedId,
        message: "Commande ORD-LOUIS-001 creee avec succes !",
      }];
    },
  },
  {
    id: "louis-step4-order-details",
    domain: "Scenario Louis",
    title: "Etape 4 - Details de la commande",
    description: "Afficher les details complets de la commande avec les infos de l'utilisateur",
    mongoQuery: `db.orders.aggregate([
  { $match: { order_number: "ORD-LOUIS-001" } },
  { $lookup: {
      from: "users",
      localField: "user_id",
      foreignField: "_id",
      as: "user"
  }},
  { $unwind: "$user" },
  { $project: {
      order_number: 1,
      status: 1,
      items: 1,
      subtotal: 1,
      shipping_cost: 1,
      discount_total: 1,
      total: 1,
      shipping_address: 1,
      created_at: 1,
      "user.first_name": 1,
      "user.last_name": 1,
      "user.email": 1
  }}
])`,
    run: async () => {
      const result = await db.collection("orders").aggregate([
        { $match: { order_number: "ORD-LOUIS-001" } },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            order_number: 1,
            status: 1,
            items: 1,
            subtotal: 1,
            shipping_cost: 1,
            discount_total: 1,
            total: 1,
            shipping_address: 1,
            created_at: 1,
            "user.first_name": 1,
            "user.last_name": 1,
            "user.email": 1,
          },
        },
      ]).toArray();
      if (result.length === 0) return [{ message: "Commande ORD-LOUIS-001 introuvable. Lancez d'abord les etapes 1, 2 et 3." }];
      return result;
    },
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

app.get("/api/collections", async (_req, res) => {
  await refreshCollections();
  res.json(knownCollections);
});

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
  // Lecture
  "find", "findOne", "aggregate", "countDocuments", "distinct",
  "estimatedDocumentCount",
  // Ecriture
  "insertOne", "insertMany",
  "updateOne", "updateMany", "replaceOne",
  "deleteOne", "deleteMany",
  "findOneAndUpdate", "findOneAndReplace", "findOneAndDelete",
  // Index
  "createIndex", "dropIndex", "indexes",
];

// Find the index of the closing paren that matches the opening paren at pos
function findClosingParen(str, pos) {
  let depth = 0;
  for (let i = pos; i < str.length; i++) {
    if (str[i] === "(" || str[i] === "[" || str[i] === "{") depth++;
    else if (str[i] === ")" || str[i] === "]" || str[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
    // Skip string literals
    if (str[i] === '"' || str[i] === "'") {
      const quote = str[i];
      i++;
      while (i < str.length && str[i] !== quote) {
        if (str[i] === "\\") i++;
        i++;
      }
    }
  }
  return -1;
}

const ALLOWED_MODIFIERS = ["sort", "limit", "skip"];

// Alias mongosh disponibles dans eval() — appelables sans "new"
// eslint-disable-next-line no-unused-vars
const ObjectId = (s) => new _ObjectId(s);
// eslint-disable-next-line no-unused-vars
const ISODate = (s) => (s ? new Date(s) : new Date());

function parseMongoQuery(raw) {
  // Must start with db.
  if (!raw.startsWith("db.")) {
    return { error: "La requete doit commencer par \"db.\"" };
  }

  // Match: db.<collection>.<method>(
  const head = raw.match(/^db\.(\w+)\.(\w+)\(/);
  if (!head) {
    const partial = raw.match(/^db\.(\w+)$/);
    if (partial) {
      return {
        error:
          `Il manque la methode apres "db.${partial[1]}".\n` +
          `Exemple : db.${partial[1]}.find({})`,
      };
    }
    const noArgs = raw.match(/^db\.(\w+)\.(\w+)$/);
    if (noArgs) {
      return {
        error:
          `Il manque les parentheses apres "${noArgs[2]}".\n` +
          `Exemple : db.${noArgs[1]}.${noArgs[2]}({})`,
      };
    }
    return { error: "Format attendu : db.<collection>.<methode>(...)" };
  }

  const collection = head[1];
  const method = head[2];

  // Check collection name against live list
  if (knownCollections.length > 0 && !knownCollections.includes(collection)) {
    return {
      error:
        `Collection "${collection}" introuvable dans la base.\n` +
        `Collections disponibles : ${knownCollections.join(", ")}`,
    };
  }

  // Check method name
  if (!ALLOWED_METHODS.includes(method)) {
    return {
      error:
        `Methode "${method}" non supportee.\n` +
        `Methodes disponibles : ${ALLOWED_METHODS.join(", ")}`,
    };
  }

  // Find matching closing paren for the method call
  const openIdx = head[0].length - 1;
  const closeIdx = findClosingParen(raw, openIdx);
  if (closeIdx === -1) {
    return {
      error:
        `Parenthese fermante manquante pour ${method}(...).\n` +
        "Verifiez que toutes les parentheses, crochets et accolades sont fermes.",
    };
  }

  const argsStr = raw.substring(openIdx + 1, closeIdx).trim();
  let args;
  try {
    args = argsStr ? eval(`([${argsStr}])`) : [];
  } catch (e) {
    return {
      error:
        `Erreur de syntaxe dans les arguments de ${method}() :\n` +
        `  ${e.message}\n\n` +
        `Arguments recus :\n  ${argsStr.substring(0, 200)}`,
    };
  }

  // Parse chained modifiers
  const modifiers = [];
  let rest = raw.substring(closeIdx + 1).trim();
  const modPattern = /^\.([\w]+)\(/;
  let modMatch;
  while ((modMatch = rest.match(modPattern))) {
    const modName = modMatch[1];

    if (!ALLOWED_MODIFIERS.includes(modName)) {
      return {
        error:
          `Modifieur ".${modName}()" non supporte.\n` +
          `Modifieurs disponibles : ${ALLOWED_MODIFIERS.map((m) => "." + m + "()").join(", ")}`,
      };
    }

    const modOpenIdx = modMatch[0].length - 1;
    const modCloseIdx = findClosingParen(rest, modOpenIdx);
    if (modCloseIdx === -1) {
      return {
        error: `Parenthese fermante manquante pour .${modName}(...).`,
      };
    }
    const modArgsStr = rest.substring(modOpenIdx + 1, modCloseIdx).trim();
    try {
      modifiers.push({ name: modName, arg: eval(`(${modArgsStr})`) });
    } catch (e) {
      return {
        error:
          `Erreur de syntaxe dans .${modName}() :\n` +
          `  ${e.message}\n\n` +
          `Arguments recus : ${modArgsStr}`,
      };
    }
    rest = rest.substring(modCloseIdx + 1).trim();
  }

  if (rest.length > 0) {
    return {
      error:
        `Texte inattendu apres la requete :\n  "${rest.substring(0, 100)}"\n\n` +
        "Verifiez la syntaxe apres la derniere parenthese fermante.",
    };
  }

  return { collection, method, args, modifiers };
}

app.use(express.json());

app.post("/api/custom-query", async (req, res) => {
  const raw = (req.body.query || "").trim();
  if (!raw) return res.status(400).json({ error: "Requete vide." });

  const parsed = parseMongoQuery(raw);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  try {
    const start = process.hrtime.bigint();
    const col = db.collection(parsed.collection);
    let cursor = col[parsed.method](...parsed.args);

    // Apply chained modifiers (sort/limit/skip) for cursors
    if (cursor && typeof cursor.sort === "function") {
      for (const mod of parsed.modifiers) {
        cursor = cursor[mod.name](mod.arg);
      }
    }

    let raw_result;
    if (cursor && typeof cursor.toArray === "function") {
      raw_result = await cursor.toArray();
    } else {
      raw_result = await cursor;
    }

    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;

    // Normalize result for display
    let result;
    let count;
    if (Array.isArray(raw_result)) {
      result = raw_result;
      count = raw_result.length;
    } else if (raw_result && typeof raw_result === "object") {
      // Write operation results (insertOne, updateOne, deleteOne, etc.)
      result = [raw_result];
      count = raw_result.insertedCount
        ?? raw_result.modifiedCount
        ?? raw_result.deletedCount
        ?? (raw_result.value ? 1 : 0)
        ?? 1;
    } else if (typeof raw_result === "number") {
      // countDocuments, estimatedDocumentCount
      result = [{ count: raw_result }];
      count = raw_result;
    } else {
      result = raw_result != null ? [raw_result] : [];
      count = result.length;
    }

    res.json({
      mongoQuery: raw,
      duration_ms: Math.round(durationMs * 100) / 100,
      count,
      result,
    });
  } catch (err) {
    const msg = err.message || String(err);
    const codeMatch = msg.match(/\((\d+)\)/);
    const prefix = codeMatch ? `[MongoDB ${codeMatch[1]}] ` : "";
    res.status(500).json({
      error: `${prefix}${msg}`,
    });
  }
});

// -- Start ---------------------------------------------------------------------

async function refreshCollections() {
  const cols = await db.listCollections().toArray();
  knownCollections = cols.map((c) => c.name).sort();
}

async function start() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  db = client.db(DB_NAME);
  await refreshCollections();
  console.log(`Connected to MongoDB (${DB_NAME}) — collections: ${knownCollections.join(", ")}`);

  app.listen(PORT, () => {
    console.log(`Query Explorer running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
