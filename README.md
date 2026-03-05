# E-Commerce Vetements de Sport -- Schema MongoDB

## Presentation

Ce document decrit l'architecture de la base de donnees MongoDB pour un site e-commerce specialise dans les vetements de sport. Le schema est concu pour gerer l'ensemble du cycle de vie d'une commande, de la navigation produit jusqu'a la livraison, tout en prenant en compte les specificites du domaine sportif (tailles techniques, materiaux, contexte d'utilisation).

## Demarrage rapide

### Prerequis

- [Docker](https://docs.docker.com/get-docker/) et [Docker Compose](https://docs.docker.com/compose/install/) installes

### Lancer l'environnement

```bash
docker compose up -d
```

Deux services demarrent :

| Service | URL | Description |
|---|---|---|
| MongoDB | `localhost:27017` | Base de donnees (base : `ecommerce_sport`) |
| Mongo Express | `http://localhost:8081` | Interface web d'administration |

Au premier lancement, le script `mongo-init/01-init.js` cree automatiquement les 11 collections, les index et un jeu de donnees de demonstration.

### Se connecter au shell Mongo

```bash
docker exec -it mongo-ecommerce mongosh ecommerce_sport
```

### Arreter l'environnement

```bash
docker compose down
```

Pour supprimer egalement les donnees et repartir de zero :

```bash
docker compose down -v
```

### Structure du projet

```
.
├── docker-compose.yml              # Orchestration des services
├── mongo-init/
│   └── 01-init.js                  # Script d'initialisation (collections, index, seed)
├── ecommerce_sports_schema.mermaid # Diagramme ER au format Mermaid
└── README.md
```

---

## Schema de la base de donnees

### Vue d'ensemble des collections

La base de donnees se compose de 11 collections organisees en 4 domaines fonctionnels.

#### Catalogue produit

**`categories`** -- Structure arborescente des categories (ex : Sport -> Running -> Chaussures) utilisant le pattern *materialized path*. Chaque categorie stocke son chemin complet (`path`) et ses ancetres (`ancestors`) pour permettre des requetes hierarchiques performantes.

**`products`** -- Fiche produit generale contenant le nom, la description, les images, la marque et les tags. Des champs specifiques au domaine sportif sont inclus : `sport_type` (running, football, yoga...), `gender_target` (homme, femme, unisexe) et `materials` (polyester, Gore-Tex, mesh...). La note moyenne et le nombre d'avis sont denormalises ici pour eviter des agregations couteuses en lecture.

**`skus`** -- Variantes d'un produit selon la taille, la couleur et le prix. Chaque SKU possede son propre code unique, ses images specifiques et un eventuel prix barre (`compare_at_price`) pour les promotions visuelles.

**`suppliers`** -- Fournisseurs rattaches aux produits. Le champ `sport_specialties` permet de filtrer les fournisseurs par domaine d'expertise sportive.

#### Gestion des stocks

**`warehouses`** -- Entrepots physiques avec leur adresse et leur type (entrepot principal, point de retrait, etc.).

**`inventory`** -- Stock d'un SKU donne dans un entrepot donne. Chaque ligne de stock possede une `quantity` disponible, une `reserved_quantity` (reservee par des paniers actifs), un champ `condition` (new, returned, damaged) pour tracer les retours, et un `reorder_threshold` pour declencher les alertes de reapprovisionnement.

#### Utilisateurs et commandes

**`users`** -- Profil client avec les adresses embarquees dans un tableau `addresses[]`. Des preferences sportives (`preferred_sports`, `preferred_sizes`) sont stockees pour personnaliser l'experience. Un champ `loyalty_tier` permet de gerer un programme de fidelite.

**`carts`** -- Panier actif de l'utilisateur. Les items sont embarques directement dans le document. Un champ `expires_at` permet de liberer le stock reserve si le panier est abandonne.

**`orders`** -- Commande complete avec les lignes de commande embarquees dans `items[]`, l'adresse de livraison snapshotee au moment de la commande, les informations de paiement et les promotions appliquees. Ce snapshot garantit l'integrite de l'historique meme si les donnees sources (adresse, prix, promo) sont modifiees par la suite.

#### Engagement client

**`reviews`** -- Avis produit avec note, commentaire et photos. Un objet `sport_context` permet au client de preciser le sport pratique, la frequence d'utilisation et les conditions (interieur, exterieur, meteo), rendant les avis particulierement utiles pour du vetement technique.

**`promotions`** -- Codes promo et reductions automatiques. Gere plusieurs types de reduction (pourcentage, montant fixe, livraison gratuite, buy X get Y) avec des conditions d'application detaillees (montant minimum, categories eligibles, limite d'utilisation par client, etc.).

---

## Principes d'architecture appliques

### Embarquer vs Referencer

Les donnees embarquees (sous-documents) sont utilisees lorsque les informations sont toujours lues ensemble et ne grossissent pas indefiniment. C'est le cas des adresses dans `users`, des items dans `orders` et `carts`, et du paiement dans `orders`.

Les references (ObjectId) sont utilisees lorsque les donnees sont partagees entre documents, interrogees independamment, ou susceptibles de croitre sans limite. C'est le cas des SKUs par rapport aux produits, de l'inventory par rapport aux SKUs, et des reviews par rapport aux produits.

### Denormalisation

Certaines donnees sont volontairement dupliquees pour optimiser les lectures. La note moyenne et le nombre d'avis sont stockes dans `products` pour eviter une agregation sur `reviews` a chaque affichage. L'adresse de livraison est copiee dans `orders` pour conserver un snapshot historique. Le nom et le prix du produit sont copies dans les items de commande pour la meme raison.

### Cardinalites

| Relation | Type | Justification |
|---|---|---|
| Supplier -> Products | 1:N | Un fournisseur fournit plusieurs produits |
| Category -> Products | 1:N | Un produit appartient a une ou plusieurs categories |
| Category -> Category | 1:N (auto-ref) | Arborescence parent-enfant |
| Product -> SKUs | 1:N | Un produit a plusieurs variantes |
| SKU -> Inventory | 1:N | Un SKU est stocke dans plusieurs entrepots |
| Warehouse -> Inventory | 1:N | Un entrepot contient plusieurs lignes de stock |
| User -> Orders | 1:N | Un utilisateur passe plusieurs commandes |
| User -> Cart | 1:1 | Un seul panier actif par utilisateur |
| User -> Reviews | 1:N | Un utilisateur redige plusieurs avis |
| Product -> Reviews | 1:N | Un produit recoit plusieurs avis |
| SKU <-> Carts | N:N | Plusieurs SKUs dans plusieurs paniers |
| SKU <-> Orders | N:N | Plusieurs SKUs dans plusieurs commandes |
| Promotion <-> Orders | N:N | Plusieurs promos applicables a plusieurs commandes |

---

## Index recommandes

Les index essentiels pour les requetes les plus frequentes sont les suivants.

**Catalogue** : `products.slug` (unique), `products.category_ids`, `products.sport_type`, `products.status`, `skus.product_id`, `skus.sku_code` (unique), `categories.slug` (unique), `categories.path`.

**Stock** : `inventory.sku_id` + `inventory.warehouse_id` (compose unique), `inventory.condition`.

**Commandes** : `orders.user_id`, `orders.order_number` (unique), `orders.status` + `orders.created_at` (compose).

**Engagement** : `reviews.product_id` + `reviews.created_at` (compose), `promotions.code` (unique sparse), `promotions.status` + `promotions.start_date` + `promotions.end_date` (compose).

---

## Donnees de demonstration

Le script d'initialisation insere un jeu de donnees coherent :

- **6 categories** -- arbre : Sport -> Running -> Chaussures / Hauts, Football, Yoga
- **2 fournisseurs** -- Nike Europe Distribution, Adidas France
- **3 produits** avec **6 SKUs** -- Pegasus 41, Ultraboost Light, Dri-FIT Tee
- **2 entrepots** et **7 lignes d'inventaire**
- **2 utilisateurs** -- Alice (gold) et Bob (silver)
- **1 panier actif** et **1 commande livree**
- **3 avis** avec contexte sportif
- **3 promotions** -- pourcentage, bienvenue, livraison gratuite

---

## Diagramme ER

Le fichier `ecommerce_sports_schema.mermaid` contient le diagramme ER au format Mermaid. Pour le visualiser dans VS Code, installer l'extension **Mermaid Editor** (Tomoyuki Asakura) qui permet l'ouverture directe des fichiers `.mermaid` avec export PNG/SVG.
