# Guide detaille des requetes MongoDB

Ce document explique en detail chacune des 25 requetes predefinies du Query Explorer. Chaque requete est accompagnee d'une explication des concepts MongoDB utilises, pensee pour des debutants.

---

## Table des matieres

1. [Concepts de base](#concepts-de-base)
2. [Catalogue (5 requetes)](#catalogue)
3. [Stock (4 requetes)](#stock)
4. [Commandes (3 requetes)](#commandes)
5. [Engagement (3 requetes)](#engagement)
6. [Ecriture (10 requetes)](#ecriture)

---

## Concepts de base

Avant de plonger dans les requetes, voici les concepts fondamentaux de MongoDB utilises dans ce projet.

### `find()` -- Rechercher des documents

`find()` est l'equivalent du `SELECT` en SQL. Il retourne tous les documents qui correspondent aux criteres donnes.

```javascript
// Syntaxe : db.<collection>.find(<filtre>)
db.products.find({ sport_type: "running" })
// Equivalent SQL : SELECT * FROM products WHERE sport_type = 'running'
```

### `aggregate()` -- Pipeline d'agregation

`aggregate()` permet de transformer les donnees etape par etape. Chaque etape (stage) recoit les documents de l'etape precedente et les transforme. C'est comme une chaine de montage.

```javascript
db.collection.aggregate([
  { $match: { ... } },    // Etape 1 : filtrer (comme WHERE)
  { $group: { ... } },    // Etape 2 : grouper (comme GROUP BY)
  { $sort: { ... } },     // Etape 3 : trier (comme ORDER BY)
])
```

### Operateurs courants

| Operateur | Role | Equivalent SQL |
| --- | --- | --- |
| `$match` | Filtrer les documents | `WHERE` |
| `$group` | Grouper et agreger | `GROUP BY` |
| `$sort` | Trier les resultats | `ORDER BY` |
| `$project` | Choisir les champs a afficher | `SELECT col1, col2` |
| `$lookup` | Joindre une autre collection | `JOIN` |
| `$unwind` | Eclater un tableau en documents individuels | (pas d'equivalent direct) |
| `$expr` | Comparer deux champs du meme document | Comparaison entre colonnes |
| `$sum` | Additionner des valeurs | `SUM()` |
| `$avg` | Calculer une moyenne | `AVG()` |

### Modifieurs de curseur

Apres un `find()`, on peut chainer des modifieurs :

```javascript
db.products.find({})
  .sort({ name: 1 })    // Trier par nom croissant (1) ou decroissant (-1)
  .limit(10)             // Limiter a 10 resultats
  .skip(20)              // Sauter les 20 premiers (pour la pagination)
```

### `ObjectId` -- Les identifiants MongoDB

En MongoDB, les identifiants (`_id`) et les champs de reference (`user_id`, `product_id`, `sku_id`...) sont stockes en type **ObjectId**, un type binaire special de 12 octets. Ce n'est **pas** une chaine de caracteres.

MongoDB applique un **typage strict** : une string et un ObjectId ayant la meme valeur hexadecimale ne sont **pas** egaux.

```javascript
// NE FONCTIONNE PAS — le user_id en base est un ObjectId, pas une string
db.orders.find({ user_id: "69a9d45103714209698563cb" })
// Resultat : 0 document (aucun match)

// FONCTIONNE — on utilise le bon type
db.orders.find({ user_id: ObjectId("69a9d45103714209698563cb") })
// Resultat : les commandes de cet utilisateur
```

**Pourquoi ?** C'est comme comparer le nombre `42` et la chaine `"42"` : pour MongoDB, ce sont deux valeurs differentes. Meme si l'affichage semble identique, le type compte.

**Comment savoir quand utiliser ObjectId ?** Quand vous faites un `db.collection.find()` dans mongosh et que le resultat affiche `ObjectId("...")` pour un champ, vous devez reutiliser `ObjectId("...")` dans vos filtres pour ce champ. Les champs texte comme `email`, `order_number` ou `slug` restent des strings classiques.

```javascript
// Champ ObjectId → utiliser ObjectId()
db.orders.find({ user_id: ObjectId("69a9d45103714209698563cb") })

// Champ string → utiliser une string classique
db.orders.find({ order_number: "ORD-2026-000001" })
```

### Operateurs d'ecriture

| Operateur | Role | Exemple |
| --- | --- | --- |
| `$set` | Modifier la valeur d'un champ | `{ $set: { status: "shipped" } }` |
| `$inc` | Incrementer une valeur numerique | `{ $inc: { quantity: 1 } }` |
| `$push` | Ajouter un element a un tableau | `{ $push: { items: { ... } } }` |
| `$pull` | Supprimer un element d'un tableau | `{ $pull: { items: { name: "X" } } }` |
| `$` (positional) | Cibler l'element du tableau qui a matche le filtre | `"items.$.quantity"` |

---

## Catalogue

### 1. Produits de running

```javascript
db.products.find({ sport_type: "running", status: "active" })
```

**Objectif** : Trouver tous les produits actifs de type running.

**Explication** :
- `find()` cherche dans la collection `products`
- Le filtre `{ sport_type: "running", status: "active" }` impose deux conditions qui doivent etre vraies **en meme temps** (AND implicite)
- MongoDB retourne tous les documents qui correspondent

**Equivalent SQL** :
```sql
SELECT * FROM products WHERE sport_type = 'running' AND status = 'active'
```

---

### 2. Arbre des categories

```javascript
db.categories.find().sort({ path: 1 })
```

**Objectif** : Afficher toutes les categories dans l'ordre hierarchique.

**Explication** :
- `find()` sans filtre retourne **tous** les documents de la collection
- `.sort({ path: 1 })` trie par le champ `path` en ordre croissant (alphabetique)
- Le champ `path` contient le chemin complet de la categorie, par exemple `"Sport,Running,Chaussures"`. Le tri alphabetique sur ce champ reconstitue naturellement l'arbre

**Concept cle -- Materialized Path** : Chaque categorie stocke son chemin complet sous forme de chaine. Cela permet de retrouver rapidement tous les enfants d'une categorie avec un simple filtre regex : `db.categories.find({ path: /^Sport,Running/ })`.

---

### 3. Recherche par materiau

```javascript
db.products.find({ materials: "mesh" })
```

**Objectif** : Trouver tous les produits qui contiennent du "mesh" dans leurs materiaux.

**Explication** :
- Le champ `materials` est un **tableau** (ex : `["polyester", "mesh", "Gore-Tex"]`)
- MongoDB sait chercher a l'interieur des tableaux automatiquement : si l'un des elements du tableau vaut `"mesh"`, le document est retourne
- Pas besoin d'operateur special, la syntaxe est la meme que pour un champ simple

**Point important** : En SQL, il faudrait une table de jointure (`product_materials`) et un `JOIN`. En MongoDB, les tableaux de valeurs simples sont directement embarques dans le document.

---

### 4. Variantes d'un produit

```javascript
db.skus.find({ product_id: <product_id> }).sort({ size: 1, color: 1 })
```

**Objectif** : Recuperer toutes les variantes (SKU = taille + couleur + prix) d'un produit donne.

**Explication** :
- `product_id` est une **reference** (ObjectId) vers le document produit parent
- `.sort({ size: 1, color: 1 })` trie d'abord par taille puis par couleur, les deux en ordre croissant
- Ce pattern (1 produit -> N SKUs) est un cas classique de relation **1:N avec reference**

**Pourquoi des references et pas de l'embarque ?** Les SKUs sont interrogees independamment (pour le stock, les paniers, les commandes). Les embarquer dans `products` compliquerait ces requetes.

---

### 5. Produit avec son fournisseur ($lookup)

```javascript
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
])
```

**Objectif** : Joindre chaque produit avec les informations de son fournisseur.

**Explication etape par etape** :

1. **`$lookup`** -- C'est le `JOIN` de MongoDB. Il va chercher dans la collection `suppliers` le document dont `_id` correspond au `supplier_id` du produit. Le resultat est place dans un **tableau** `supplier` (meme s'il n'y a qu'un seul resultat).

2. **`$unwind: "$supplier"`** -- Comme `$lookup` retourne toujours un tableau, `$unwind` le "deplie" pour obtenir un objet simple au lieu d'un tableau a un element. Si un produit n'a pas de fournisseur, le document est supprime du resultat (comme un `INNER JOIN`).

3. **`$project`** -- Selectionne les champs a afficher. `1` signifie "inclure ce champ". On peut acceder aux champs du fournisseur via la notation pointee `"supplier.company_name"`.

**Equivalent SQL** :
```sql
SELECT p.name, p.brand, p.sport_type, s.company_name, s.sport_specialties
FROM products p
INNER JOIN suppliers s ON p.supplier_id = s._id
```

---

## Stock

### 6. Disponibilite d'un SKU par entrepot

```javascript
db.inventory.aggregate([
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
])
```

**Objectif** : Voir le stock disponible d'un SKU dans chaque entrepot.

**Explication** :

1. **`$match`** -- Filtre les lignes d'inventaire pour un SKU precis. C'est l'equivalent du `WHERE` et il doit etre place **le plus tot possible** dans le pipeline pour reduire le nombre de documents traites.

2. **`$lookup` + `$unwind`** -- Jointure avec la collection `warehouses` pour recuperer le nom de l'entrepot (meme principe que la requete 5).

3. **`$project` avec `$subtract`** -- Cree un champ calcule `available` qui vaut `quantity - reserved_quantity`. L'operateur `$subtract` prend un tableau de deux valeurs et retourne leur difference. Le prefixe `$` devant les noms de champs indique a MongoDB d'utiliser la **valeur du champ** (et non la chaine litterale).

---

### 7. Alertes de reapprovisionnement

```javascript
db.inventory.find({
  $expr: {
    $lte: [
      { $subtract: ["$quantity", "$reserved_quantity"] },
      "$reorder_threshold"
    ]
  }
})
```

**Objectif** : Trouver les SKUs dont le stock disponible est inferieur ou egal au seuil de reapprovisionnement.

**Explication** :

- **`$expr`** permet de comparer **deux champs du meme document** entre eux. Sans `$expr`, un filtre `find()` compare toujours un champ a une **valeur fixe**
- `$subtract: ["$quantity", "$reserved_quantity"]` calcule le stock reellement disponible
- `$lte` (less than or equal) verifie que ce stock disponible est inferieur ou egal au champ `$reorder_threshold`

**Pourquoi `$expr` ?** Un filtre classique comme `{ quantity: { $lte: 10 } }` compare `quantity` au nombre fixe 10. Ici, on veut comparer `quantity - reserved_quantity` a un **autre champ** (`reorder_threshold`), ce qui necessite `$expr`.

**Equivalent SQL** :
```sql
SELECT * FROM inventory WHERE (quantity - reserved_quantity) <= reorder_threshold
```

---

### 8. Stock total par produit

```javascript
db.inventory.aggregate([
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
])
```

**Objectif** : Calculer le stock total par produit, toutes variantes et entrepots confondus.

**Explication** :

Ce pipeline est plus complexe car il enchaine **deux jointures et un groupement** :

1. **`$lookup` skus** -- Associe chaque ligne d'inventaire a sa SKU pour recuperer le `product_id`
2. **`$unwind`** -- Deplie le tableau
3. **`$group`** -- Regroupe toutes les lignes par `product_id` et calcule :
   - `$sum: "$quantity"` -- somme de toutes les quantites
   - `$sum: "$reserved_quantity"` -- somme de toutes les reservations
   - Le champ `_id` indique par quoi on regroupe (ici `$sku.product_id`)
4. **`$lookup` products** -- Deuxieme jointure pour recuperer le nom du produit
5. **`$project`** -- Formate le resultat final avec un champ calcule `available`

**Equivalent SQL** :
```sql
SELECT p.name, SUM(i.quantity) AS total_quantity,
       SUM(i.reserved_quantity) AS total_reserved,
       SUM(i.quantity) - SUM(i.reserved_quantity) AS available
FROM inventory i
JOIN skus s ON i.sku_id = s._id
JOIN products p ON s.product_id = p._id
GROUP BY p._id, p.name
```

---

## Commandes

### 9. Historique commandes d'un utilisateur

```javascript
db.orders.find({ user_id: <user_id> }).sort({ created_at: -1 })
```

**Objectif** : Recuperer toutes les commandes d'un utilisateur, les plus recentes en premier.

**Explication** :
- Filtre simple sur `user_id`
- `.sort({ created_at: -1 })` -- le `-1` signifie tri **decroissant** (du plus recent au plus ancien)
- L'index compose `{ status: 1, created_at: 1 }` aide MongoDB a effectuer cette requete efficacement

---

### 10. Chiffre d'affaires par produit

```javascript
db.orders.aggregate([
  { $unwind: "$items" },
  { $group: {
      _id: "$items.product_name",
      total_revenue: {
        $sum: { $multiply: ["$items.price", "$items.quantity"] }
      },
      total_units: { $sum: "$items.quantity" }
  }},
  { $sort: { total_revenue: -1 } }
])
```

**Objectif** : Calculer le chiffre d'affaires genere par chaque produit.

**Explication** :

1. **`$unwind: "$items"`** -- Chaque commande contient un tableau `items[]` avec plusieurs articles. `$unwind` cree **un document par article**. Une commande avec 3 articles devient 3 documents.

2. **`$group`** -- Regroupe par nom de produit et calcule :
   - `$multiply: ["$items.price", "$items.quantity"]` -- chiffre d'affaires par ligne (prix x quantite)
   - `$sum` -- additionne les CA de toutes les commandes pour ce produit
   - `total_units` -- nombre total d'unites vendues

3. **`$sort: { total_revenue: -1 }`** -- Trie du CA le plus eleve au plus faible

**Concept cle -- Denormalisation** : Le `product_name` et le `price` sont copies directement dans les items de la commande. Cela evite de faire un `$lookup` vers `products` et garantit que le prix affiche est celui au moment de l'achat (pas le prix actuel).

---

### 11. Repartition des commandes par statut

```javascript
db.orders.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

**Objectif** : Compter le nombre de commandes par statut (confirmed, shipped, delivered...).

**Explication** :
- `$group` avec `_id: "$status"` regroupe les commandes par leur champ `status`
- `$sum: 1` compte 1 pour chaque document rencontre (equivalent de `COUNT(*)` en SQL)
- Resultat : `[{ _id: "delivered", count: 1 }, { _id: "confirmed", count: 1 }, ...]`

**Equivalent SQL** :
```sql
SELECT status, COUNT(*) AS count FROM orders GROUP BY status ORDER BY count DESC
```

---

## Engagement

### 12. Avis d'un produit avec contexte sportif

```javascript
db.reviews.aggregate([
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
])
```

**Objectif** : Afficher les avis d'un produit avec le nom de l'auteur et le contexte sportif.

**Explication** :

1. **`$match`** -- Filtre les avis pour un produit donne
2. **`$lookup`** -- Jointure avec `users` pour recuperer le prenom et nom de l'auteur
3. **`$project`** -- Selectionne uniquement les champs pertinents. Notez `sport_context: 1` qui inclut tout le sous-document (sport pratique, frequence, conditions meteo)
4. **`$sort`** -- Les avis les plus recents en premier

**Concept cle -- `sport_context`** : C'est un sous-document embarque dans chaque avis. Il contient `{ sport, frequency, conditions, weather }`. Cela permet aux acheteurs de trouver des avis de personnes ayant le meme usage qu'eux.

---

### 13. Promotions actives

```javascript
db.promotions.find({
  status: "active",
  start_date: { $lte: new Date() },
  end_date: { $gte: new Date() }
})
```

**Objectif** : Trouver les promotions actuellement valides.

**Explication** :
- Trois conditions AND :
  - `status: "active"` -- la promotion n'est pas desactivee
  - `start_date: { $lte: new Date() }` -- la date de debut est dans le passe ou maintenant (`$lte` = less than or equal, inferieur ou egal)
  - `end_date: { $gte: new Date() }` -- la date de fin est dans le futur ou maintenant (`$gte` = greater than or equal, superieur ou egal)
- `new Date()` retourne la date et l'heure actuelles

**Operateurs de comparaison** :
| Operateur | Signification |
| --- | --- |
| `$lt` | Strictement inferieur |
| `$lte` | Inferieur ou egal |
| `$gt` | Strictement superieur |
| `$gte` | Superieur ou egal |
| `$ne` | Different de |
| `$in` | Dans une liste de valeurs |

---

### 14. Note moyenne par sport

```javascript
db.reviews.aggregate([
  { $group: {
      _id: "$sport_context.sport",
      avg_rating: { $avg: "$rating" },
      count: { $sum: 1 }
  }},
  { $sort: { avg_rating: -1 } }
])
```

**Objectif** : Calculer la note moyenne des avis par type de sport.

**Explication** :
- `_id: "$sport_context.sport"` -- regroupe par le champ `sport` a l'interieur du sous-document `sport_context`. La notation pointee permet d'acceder aux champs imbriques
- `$avg: "$rating"` -- calcule la moyenne des notes pour chaque groupe
- `$sum: 1` -- compte le nombre d'avis par sport

---

## Ecriture

Les requetes d'ecriture modifient les donnees de la base. Elles sont concues pour etre **idempotentes** : vous pouvez les executer plusieurs fois sans probleme (les doublons sont nettoyes automatiquement).

### 15. Creer un panier

```javascript
db.carts.insertOne({
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
})
```

**Objectif** : Inserer un nouveau panier avec deux articles.

**Explication** :
- **`insertOne()`** insere un seul document dans la collection
- Le document contient :
  - `user_id` -- reference vers l'utilisateur
  - `items` -- tableau d'articles avec les informations **denormalisees** (nom, prix copie depuis le produit)
  - `expires_at` -- date d'expiration calculee a J+7 (`Date.now()` en millisecondes + 7 jours). Cela permet de liberer le stock reserve si le panier est abandonne
  - `updated_at` -- date de derniere modification
- Retourne un objet `{ acknowledged: true, insertedId: ObjectId("...") }`

---

### 16. Ajouter un article au panier

```javascript
db.carts.updateOne(
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
)
```

**Objectif** : Ajouter un nouvel article au panier existant.

**Explication** :
- **`updateOne()`** modifie **un seul** document correspondant au filtre
- Premier argument : le **filtre** -- quel document modifier
- Deuxieme argument : les **modifications** :
  - `$push: { items: { ... } }` -- ajoute un element a la fin du tableau `items`
  - `$set: { updated_at: new Date() }` -- met a jour la date de modification
- On peut combiner plusieurs operateurs (`$push` et `$set`) dans la meme requete
- Retourne `{ matchedCount: 1, modifiedCount: 1 }`

---

### 17. Modifier la quantite d'un article

```javascript
db.carts.updateOne(
  { user_id: ObjectId("<user_id>"), "items.product_name": "Nike Dri-FIT Running Tee" },
  { $inc: { "items.$.quantity": 1 }, $set: { updated_at: new Date() } }
)
```

**Objectif** : Incrementer la quantite d'un article specifique du panier.

**Explication** :
- Le filtre contient `"items.product_name": "Nike Dri-FIT Running Tee"` -- cela cherche le panier qui contient un article avec ce nom dans son tableau `items`
- **`$inc: { "items.$.quantity": 1 }`** -- incremente la quantite de 1

**Concept cle -- Operateur positionnel `$`** :
- Le `$` dans `"items.$.quantity"` fait reference a l'element du tableau qui a **matche le filtre**
- MongoDB se souvient de quel element du tableau `items` correspondait a `product_name: "Nike Dri-FIT Running Tee"` et applique le `$inc` uniquement sur **cet** element
- Sans le `$`, MongoDB ne saurait pas quel element du tableau modifier

---

### 18. Supprimer un article du panier

```javascript
db.carts.updateOne(
  { user_id: ObjectId("<user_id>") },
  {
    $pull: { items: { product_name: "Adidas Ultraboost Light" } },
    $set: { updated_at: new Date() }
  }
)
```

**Objectif** : Retirer un article du panier.

**Explication** :
- **`$pull`** supprime tous les elements d'un tableau qui correspondent au critere donne
- `$pull: { items: { product_name: "Adidas Ultraboost Light" } }` -- supprime du tableau `items` tout element dont `product_name` vaut "Adidas Ultraboost Light"
- Contrairement a `$push` qui ajoute, `$pull` retire

**Comparaison `$push` / `$pull` / `$` :**
| Operateur | Action |
| --- | --- |
| `$push` | Ajouter un element au tableau |
| `$pull` | Supprimer un element du tableau (par critere) |
| `$pop` | Supprimer le premier ou dernier element |
| `$` (positionnel) | Cibler un element existant pour le modifier |

---

### 19. Creer une commande

```javascript
db.orders.insertOne({
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
})
```

**Objectif** : Transformer un panier en commande.

**Explication** :
- Les `items` sont **copies** depuis le panier vers la commande. C'est un **snapshot** : si le prix du produit change demain, la commande garde le prix d'achat original
- `shipping_address` est aussi un snapshot de l'adresse de l'utilisateur au moment de la commande
- Le champ `payment` est un sous-document embarque contenant les informations de paiement
- `applied_promotions` est un tableau vide ici (aucune promo appliquee)

**Concept cle -- Snapshot** : Copier les donnees au moment de la creation plutot que de stocker une reference. Cela garantit que l'historique reste coherent meme si les donnees sources (prix, adresse) changent.

---

### 20. Mettre a jour le statut d'une commande

```javascript
db.orders.findOneAndUpdate(
  { order_number: "ORD-2026-000002" },
  { $set: { status: "shipped" } },
  { returnDocument: "after" }
)
```

**Objectif** : Passer une commande de "confirmed" a "shipped".

**Explication** :
- **`findOneAndUpdate()`** combine la recherche et la modification en une **seule operation atomique**. C'est plus sur que de faire un `find()` suivi d'un `update()` car aucun autre processus ne peut modifier le document entre les deux
- `{ returnDocument: "after" }` -- retourne le document **apres** modification (par defaut, MongoDB retourne le document tel qu'il etait **avant**)

**Difference avec `updateOne()`** :
| Methode | Retourne |
| --- | --- |
| `updateOne()` | `{ matchedCount, modifiedCount }` (compteurs uniquement) |
| `findOneAndUpdate()` | Le document complet (avant ou apres modification) |

Utilisez `findOneAndUpdate()` quand vous avez besoin de recuperer le document modifie dans la meme operation.

---

### 21. Ajouter une adresse utilisateur

```javascript
db.users.updateOne(
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
)
```

**Objectif** : Ajouter une nouvelle adresse au profil de Bob.

**Explication** :
- Meme principe que l'ajout d'article au panier (requete 16)
- `$push` sur le tableau `addresses[]` de l'utilisateur
- L'adresse est un **sous-document embarque** -- pas besoin d'une collection separee car les adresses ne sont pas partagees entre utilisateurs

**Attention** : Executer cette requete plusieurs fois ajoutera des doublons. Pour eviter cela en production, on utiliserait `$addToSet` (qui n'ajoute que si l'element n'existe pas deja) ou un filtre plus precis.

---

### 22. Deposer un avis produit

```javascript
db.reviews.insertOne({
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
})
```

**Objectif** : Inserer un avis et mettre a jour la note moyenne du produit.

**Explication** :
- L'insertion de l'avis est simple : `insertOne()` avec les references vers le produit et l'utilisateur
- Le sous-document `sport_context` donne du contexte utile pour des vetements de sport
- **En plus** de l'insertion, cette requete **recalcule et met a jour** la note moyenne sur le document produit (`avg_rating` et `review_count`). C'est un exemple de **denormalisation maintenue manuellement** : a chaque nouvel avis, on doit mettre a jour le produit

**Pourquoi denormaliser ?** Sans denormalisation, chaque affichage de produit necessiterait un `aggregate` sur `reviews` pour calculer la note moyenne. Avec la note stockee directement dans `products`, un simple `find()` suffit.

---

### 23. Reapprovisionner un SKU

```javascript
db.inventory.updateOne(
  { sku_id: ObjectId("<sku_id>"), warehouse_id: ObjectId("<warehouse_id>") },
  {
    $inc: { quantity: 50 },
    $set: { last_restock_date: new Date() }
  }
)
```

**Objectif** : Ajouter 50 unites au stock d'un SKU dans un entrepot.

**Explication** :
- Le filtre cible une ligne d'inventaire precise : un SKU dans un entrepot donne (cle compose)
- **`$inc: { quantity: 50 }`** -- ajoute 50 a la quantite actuelle. `$inc` est **atomique** : meme si deux requetes arrivent en meme temps, MongoDB garantit que les deux increments seront appliques correctement
- `$set: { last_restock_date: new Date() }` -- enregistre la date du reapprovisionnement

**Concept cle -- Atomicite** : `$inc` est preferable a lire la valeur, l'incrementer en JavaScript, et reecrire le resultat. Cette derniere approche est sujette aux **conditions de concurrence** (race conditions) si deux utilisateurs modifient en meme temps.

---

### 24. Supprimer la commande de demo

```javascript
db.orders.deleteOne({ order_number: "ORD-2026-000002" })
```

**Objectif** : Nettoyer la commande creee par les exemples precedents.

**Explication** :
- **`deleteOne()`** supprime **un seul** document correspondant au filtre
- Si plusieurs documents correspondent, seul le premier est supprime. Pour supprimer tous les documents correspondants, utiliser `deleteMany()`
- Retourne `{ deletedCount: 1 }` si un document a ete supprime, `{ deletedCount: 0 }` sinon

**Comparaison** :
| Methode | Action |
| --- | --- |
| `deleteOne()` | Supprime un seul document |
| `deleteMany()` | Supprime tous les documents correspondants |
| `drop()` | Supprime toute la collection |

---

## Resume des methodes utilisees

### Lecture

| Methode | Usage | Requetes |
| --- | --- | --- |
| `find()` | Recherche avec filtre | 1, 2, 3, 4, 7, 9, 13 |
| `aggregate()` | Pipeline de transformation | 5, 6, 8, 10, 11, 12, 14 |

### Ecriture

| Methode | Usage | Requetes |
| --- | --- | --- |
| `insertOne()` | Inserer un document | 15, 19, 22 |
| `updateOne()` | Modifier un document | 16, 17, 18, 21, 23 |
| `findOneAndUpdate()` | Modifier et retourner | 20 |
| `deleteOne()` | Supprimer un document | 24 |

### Operateurs de mise a jour utilises

| Operateur | Requetes |
| --- | --- |
| `$set` | 16, 17, 18, 20, 23 |
| `$inc` | 17, 23 |
| `$push` | 16, 21 |
| `$pull` | 18 |
| `$` (positionnel) | 17 |

### Stages d'agregation utilises

| Stage | Requetes |
| --- | --- |
| `$match` | 6, 12 |
| `$lookup` | 5, 6, 8, 12 |
| `$unwind` | 5, 6, 8, 10, 12 |
| `$group` | 8, 10, 11, 14 |
| `$project` | 5, 6, 8, 12 |
| `$sort` | 10, 11, 14 |
