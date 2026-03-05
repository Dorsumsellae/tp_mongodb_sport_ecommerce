# E-Commerce Vêtements de Sport — Schéma MongoDB

## Présentation

Ce document décrit l'architecture de la base de données MongoDB pour un site e-commerce spécialisé dans les vêtements de sport. Le schéma est conçu pour gérer l'ensemble du cycle de vie d'une commande, de la navigation produit jusqu'à la livraison, tout en prenant en compte les spécificités du domaine sportif (tailles techniques, matériaux, contexte d'utilisation).

## Vue d'ensemble des collections

La base de données se compose de 11 collections organisées en 4 domaines fonctionnels.

### Catalogue produit

**`categories`** — Structure arborescente des catégories (ex : Sport → Running → Chaussures) utilisant le pattern *materialized path*. Chaque catégorie stocke son chemin complet (`path`) et ses ancêtres (`ancestors`) pour permettre des requêtes hiérarchiques performantes.

**`products`** — Fiche produit générale contenant le nom, la description, les images, la marque et les tags. Des champs spécifiques au domaine sportif sont inclus : `sport_type` (running, football, yoga…), `gender_target` (homme, femme, unisexe) et `materials` (polyester, Gore-Tex, mesh…). La note moyenne et le nombre d'avis sont dénormalisés ici pour éviter des agrégations coûteuses en lecture.

**`skus`** — Variantes d'un produit selon la taille, la couleur et le prix. Chaque SKU possède son propre code unique, ses images spécifiques et un éventuel prix barré (`compare_at_price`) pour les promotions visuelles.

**`suppliers`** — Fournisseurs rattachés aux produits. Le champ `sport_specialties` permet de filtrer les fournisseurs par domaine d'expertise sportive.

### Gestion des stocks

**`warehouses`** — Entrepôts physiques avec leur adresse et leur type (entrepôt principal, point de retrait, etc.).

**`inventory`** — Stock d'un SKU donné dans un entrepôt donné. Chaque ligne de stock possède une `quantity` disponible, une `reserved_quantity` (réservée par des paniers actifs), un champ `condition` (new, returned, damaged) pour tracer les retours, et un `reorder_threshold` pour déclencher les alertes de réapprovisionnement.

### Utilisateurs et commandes

**`users`** — Profil client avec les adresses embarquées dans un tableau `addresses[]`. Des préférences sportives (`preferred_sports`, `preferred_sizes`) sont stockées pour personnaliser l'expérience. Un champ `loyalty_tier` permet de gérer un programme de fidélité.

**`carts`** — Panier actif de l'utilisateur. Les items sont embarqués directement dans le document. Un champ `expires_at` permet de libérer le stock réservé si le panier est abandonné.

**`orders`** — Commande complète avec les lignes de commande embarquées dans `items[]`, l'adresse de livraison snapshotée au moment de la commande, les informations de paiement et les promotions appliquées. Ce snapshot garantit l'intégrité de l'historique même si les données sources (adresse, prix, promo) sont modifiées par la suite.

### Engagement client

**`reviews`** — Avis produit avec note, commentaire et photos. Un objet `sport_context` permet au client de préciser le sport pratiqué, la fréquence d'utilisation et les conditions (intérieur, extérieur, météo), rendant les avis particulièrement utiles pour du vêtement technique.

**`promotions`** — Codes promo et réductions automatiques. Gère plusieurs types de réduction (pourcentage, montant fixe, livraison gratuite, buy X get Y) avec des conditions d'application détaillées (montant minimum, catégories éligibles, limite d'utilisation par client, etc.).

## Principes d'architecture appliqués

### Embarquer vs Référencer

Les données embarquées (sous-documents) sont utilisées lorsque les informations sont toujours lues ensemble et ne grossissent pas indéfiniment. C'est le cas des adresses dans `users`, des items dans `orders` et `carts`, et du paiement dans `orders`.

Les références (ObjectId) sont utilisées lorsque les données sont partagées entre documents, interrogées indépendamment, ou susceptibles de croître sans limite. C'est le cas des SKUs par rapport aux produits, de l'inventory par rapport aux SKUs, et des reviews par rapport aux produits.

### Dénormalisation

Certaines données sont volontairement dupliquées pour optimiser les lectures. La note moyenne et le nombre d'avis sont stockés dans `products` pour éviter une agrégation sur `reviews` à chaque affichage. L'adresse de livraison est copiée dans `orders` pour conserver un snapshot historique. Le nom et le prix du produit sont copiés dans les items de commande pour la même raison.

### Cardinalités

| Relation | Type | Justification |
|---|---|---|
| Supplier → Products | 1:N | Un fournisseur fournit plusieurs produits |
| Category → Products | 1:N | Un produit appartient à une ou plusieurs catégories |
| Category → Category | 1:N (auto-ref) | Arborescence parent-enfant |
| Product → SKUs | 1:N | Un produit a plusieurs variantes |
| SKU → Inventory | 1:N | Un SKU est stocké dans plusieurs entrepôts |
| Warehouse → Inventory | 1:N | Un entrepôt contient plusieurs lignes de stock |
| User → Orders | 1:N | Un utilisateur passe plusieurs commandes |
| User → Cart | 1:1 | Un seul panier actif par utilisateur |
| User → Reviews | 1:N | Un utilisateur rédige plusieurs avis |
| Product → Reviews | 1:N | Un produit reçoit plusieurs avis |
| SKU ↔ Carts | N:N | Plusieurs SKUs dans plusieurs paniers |
| SKU ↔ Orders | N:N | Plusieurs SKUs dans plusieurs commandes |
| Promotion ↔ Orders | N:N | Plusieurs promos applicables à plusieurs commandes |

## Index recommandés

Les index essentiels pour les requêtes les plus fréquentes sont les suivants.

**Catalogue** : `products.slug` (unique), `products.category_ids`, `products.sport_type`, `products.status`, `skus.product_id`, `skus.sku_code` (unique), `categories.slug` (unique), `categories.path`.

**Stock** : `inventory.sku_id` + `inventory.warehouse_id` (composé unique), `inventory.condition`.

**Commandes** : `orders.user_id`, `orders.order_number` (unique), `orders.status` + `orders.created_at` (composé).

**Engagement** : `reviews.product_id` + `reviews.created_at` (composé), `promotions.code` (unique sparse), `promotions.status` + `promotions.start_date` + `promotions.end_date` (composé).

## Lecture du diagramme

Le fichier `ecommerce_sports_schema.mermaid` contient le diagramme ER au format Mermaid. Pour le visualiser dans VS Code, installer l'extension **Mermaid Editor** (Tomoyuki Asakura) qui permet l'ouverture directe des fichiers `.mermaid` avec export PNG/SVG.
