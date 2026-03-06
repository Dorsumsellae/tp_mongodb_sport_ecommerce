use("ecommerce_sport");

// ── Carte 1 - Produits de running ──────────────────────
db.products.find({ sport_type: "running", status: "active" });

// ── Carte 2 - Arbre des catégories ─────────────────────
db.categories.find().sort({ path: 1 });

// ── Carte 3 - Recherche par matériau ───────────────────
db.products.find({ materials: "mesh" });

// ── Carte 4 - Variantes d'un produit ───────────────────
db.skus.find({ sku_code: "NK-PEG41-WHT-42" }).sort({ size: 1, color: 1 });

// ── Carte 5 - Produit avec fournisseur ($lookup) ────────
db.products.aggregate([
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
]);