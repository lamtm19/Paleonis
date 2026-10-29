# Contrat d'API PaLeonis

Toutes les URL commencent par `http://localhost:3000/api`.
Format d'erreur : `{ "message": "..." }` (avec `details` pour les erreurs de validation Mongoose).

## TP 3 : PostgreSQL

| Méthode | URL | Rôle | Besoin |
|---|---|---|---|
| GET | `/catalog` | Lister les offres | B2 |
| GET | `/catalog/:id` | Une offre **avec sa fiche technique** (voir N1) | B2, N1 |
| POST | `/catalog` | Créer une offre | B2 |
| PUT | `/catalog/:id` | Modifier une offre | B2 |
| DELETE | `/catalog/:id` | Supprimer une offre (et sa fiche MongoDB) | B2, N1 |
| GET | `/servers` | Lister les serveurs (filtres datacenter, statut, libre) | B6 |
| GET / POST / PUT / DELETE | `/servers/:id` | CRUD d'un serveur | B6 |
| GET | `/dashboard` | Tableau de bord de la direction | B9 |
| GET | `/datacenters`, `/datacenters/:id` | Consulter les datacenters | B10 |
| GET | `/technicians`, `/technicians/:id` | Consulter les techniciens | B10 |
| GET | `/technicians/:id/tickets` | Tickets non fermés d'un technicien, du plus critique au moins critique | B8 |
| POST | `/tickets` | Ouvrir un ticket | B7 |
| GET | `/tickets/:id` | Un ticket **avec son fil de messages** (voir N3) | B7, N3 |
| PATCH | `/tickets/:id/assign` | Assigner un technicien | B7 |
| PATCH | `/tickets/:id/status` | Changer le statut | B7 |

## TP 4 : MongoDB

### N1 : fiches techniques

| Méthode | URL | Body | Réponses |
|---|---|---|---|
| PUT | `/catalog/:id/fiche` | Champs de la fiche selon la catégorie de l'offre (voir ci-dessous), plus `autres` (objet libre, facultatif) | 201 créée, 200 remplacée, 400 id invalide, 404 offre introuvable, 422 champ obligatoire manquant |
| GET | `/catalog/:id` | – | 200 : l'offre PostgreSQL + `fiche_technique` (ou `null`) |

Champs obligatoires par catégorie :

| Catégorie | Champs |
|---|---|
| `VPS` | `vcpu`, `ramGo`, `stockageGo`, `os` (`typeStockage` facultatif) |
| `hebergement mutualise` | `stockageGo`, `nbSitesMax` (`certificatSsl` facultatif) |
| `serveur dedie` | `processeur`, `ramGo`, `bandePassanteGbps`, `disques` : `[{ "typeDisque", "capaciteGo" }]` |
| `nom de domaine` | `extension`, `registrar`, `dureeEngagementMois` |

Exemple : `PUT /catalog/1/fiche`
```json
{ "vcpu": 2, "ramGo": 4, "stockageGo": 80, "typeStockage": "NVMe", "os": "Ubuntu 24.04" }
```

### N2 : journal d'activité des serveurs

| Méthode | URL | Body / paramètres | Réponses |
|---|---|---|---|
| POST | `/servers/:id/evenements` | `type` + champs du type (voir ci-dessous), `date` facultative | 201, 400, 404 serveur introuvable, 422 type inconnu ou champ manquant |
| GET | `/servers/:id/evenements` | Query facultatifs : `type`, `debut`, `fin` (dates `2026-10-27`), `limite` (1 à 500, 50 par défaut) | 200 du plus récent au plus ancien, 400, 404, 422 |
| GET | `/servers/:id/evenements/stats` | – | 200 : `{ serveurId, parType: [{ type, total }] }`, 404 |

| Type | Champs |
|---|---|
| `redemarrage` | `planifie` (booléen), `motif` facultatif |
| `alerte` | `niveau` (`info`, `avertissement`, `critique`), `message` |
| `maintenance` | `description`, `dureeMinutes`, `technicienId` facultatif |
| `metrique` | `cpu`, `ram`, `disque` (pourcentages de 0 à 100) |

Exemple : `POST /servers/1/evenements`
```json
{ "type": "alerte", "niveau": "critique", "message": "Ping perdu depuis 5 minutes" }
```

### N3 : messages sur les tickets

| Méthode | URL | Body | Réponses |
|---|---|---|---|
| POST | `/tickets/:id/messages` | `auteur: { role: "client" ou "technicien", id }`, `contenu`, `piecesJointes` facultatif : `[{ nom, url }]` | 201, 400, 404 ticket ou technicien introuvable, 409 ticket fermé, 422 le client n'est pas celui du ticket |
| GET | `/tickets/:id` | – | 200 : le ticket + `messages` dans l'ordre chronologique |

Exemple : `POST /tickets/1/messages`
```json
{ "auteur": { "role": "technicien", "id": 1 }, "contenu": "Redémarrage effectué.",
  "piecesJointes": [ { "nom": "logs.txt", "url": "https://files.paleonis.fr/t1/logs.txt" } ] }
```
