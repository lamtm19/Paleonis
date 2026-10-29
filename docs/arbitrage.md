# Note d'arbitrage : PostgreSQL ou MongoDB ?

Pour chaque nouvelle donnée, je me suis posé la même question : est-ce que sa forme est toujours la même et est-ce qu'elle a besoin de liens solides avec le reste ? Si oui, PostgreSQL. Si la forme change tout le temps ou qu'il y en a énormément, MongoDB.

## 1. Mon tableau de décision

| Donnée                      | PostgreSQL ou MongoDB | Critère décisif                        | Forme retenue                                         |
| --------------------------- | --------------------- | -------------------------------------- | ----------------------------------------------------- |
| Fiche technique d'une offre | MongoDB               | Structure variable selon la catégorie  | Un document par offre, un discriminator par catégorie |
| Événement serveur           | MongoDB               | Gros volume d'écriture, jamais modifié | Un document par événement, un discriminator par type  |
| Message de ticket           | MongoDB               | Fil qui grossit sans limite            | Un document par message, référencé par `ticketId`     |

Le reste (clients, offres, abonnements, serveurs, tickets) reste dans PostgreSQL : ces données ont besoin de liens solides entre elles, et la souscription (B3) doit réussir en entier ou pas du tout.

## 2. À quoi ressemblent mes documents

**N1 : une fiche technique** (offre 1, « VPS Starter »)

```json
{
  "_id": "6720f1a2c3d4e5f601a2b3c1",
  "offreId": 1,
  "categorie": "VPS",
  "vcpu": 2,
  "ramGo": 4,
  "stockageGo": 80,
  "typeStockage": "NVMe",
  "os": "Ubuntu 24.04",
  "autres": { "sauvegardeQuotidienne": true },
  "createdAt": "2026-10-29T09:00:00Z",
  "updatedAt": "2026-10-29T09:00:00Z"
}
```

Pour un nom de domaine (offre 7), on aurait plutôt `extension`, `registrar` et `dureeEngagementMois`, et pas de `vcpu` ni de `ramGo`. Chaque catégorie a ses champs obligatoires. Le champ `autres` est une zone libre : c'est là que le commercial peut rajouter ce qu'il veut sans qu'on change quoi que ce soit.

**N2 : des événements** (serveur 1, `srv-par-01`)

```json
{ "_id": "6720f1a2c3d4e5f601a2b3d7", "serveurId": 1, "type": "alerte",
  "date": "2026-10-27T08:10:00Z", "niveau": "critique", "message": "Ping perdu depuis 5 minutes" }
{ "_id": "6720f1a2c3d4e5f601a2b3d8", "serveurId": 1, "type": "metrique",
  "date": "2026-10-27T08:00:00Z", "cpu": 97.5, "ram": 88.2, "disque": 64.0 }
```

On voit bien que les deux n'ont pas les mêmes champs, c'est pour ça que je les ai mis dans MongoDB.

**N3 : un message** (ticket 1, échange entre le client 1 et le technicien 1)

```json
{
  "_id": "6720f1a2c3d4e5f601a2b3e2",
  "ticketId": 1,
  "auteur": { "role": "technicien", "id": 1 },
  "contenu": "Redémarrage effectué, pouvez-vous vérifier ?",
  "date": "2026-10-27T09:30:00Z",
  "piecesJointes": [
    {
      "nom": "logs-boot.txt",
      "url": "https://files.paleonis.fr/t1/logs-boot.txt"
    }
  ]
}
```

**Imbriqué ou référencé ? J'ai choisi référencé.** Imbriqué, ça voudrait dire mettre toute la conversation dans un seul gros document par ticket. Le problème, c'est qu'une conversation n'a pas de limite, alors qu'un document MongoDB ne peut pas dépasser 16 Mo. Et à chaque nouveau message, il faudrait réécrire un document de plus en plus lourd. Avec un document par message, ajouter un message c'est juste un ajout tout simple. Et je peux quand même lire tout le fil en une seule requête : `find({ ticketId }).sort({ date: 1 })`, qui est rapide grâce à l'index.

## 3. Le lien entre les deux bases

**Qui vérifie que l'offre ou le serveur existe ?** C'est mon API. Entre PostgreSQL et MongoDB, il n'y a aucune clé étrangère : si j'écris `offreId: 999` dans Mongo, il l'accepte sans rien dire. Donc avant d'écrire dans Mongo, mon code va demander à PostgreSQL si l'offre, le serveur ou le ticket existe. Si ça n'existe pas, je réponds 404. Pour les messages (N3), je vérifie en plus que l'auteur est bien le client du ticket ou un technicien qui existe, et que le ticket n'est pas fermé (sinon 409).

**Et si on supprime quelque chose dans PostgreSQL ?** On ne peut pas faire une transaction sur deux bases en même temps. Du coup je supprime d'abord dans PostgreSQL, et seulement si ça a marché, je supprime dans Mongo.

| Ce qu'on supprime dans PostgreSQL | Ce que deviennent les documents Mongo     | Pourquoi                                                                                                                                                                          |
| --------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Une offre                         | Sa fiche est **supprimée** aussi          | Une fiche sans offre ne sert à rien. Par contre, si l'offre a encore des abonnements, PostgreSQL bloque la suppression (409) : on la retire juste de la vente, et la fiche reste. |
| Un serveur                        | Ses événements sont **gardés**            | Le journal, c'est l'historique du serveur, ça sert de preuve en cas de problème.                                                                                                  |
| Un ticket                         | Ses messages devraient être **supprimés** | La conversation appartient au ticket. Pour l'instant l'API n'a pas de route pour supprimer un ticket, mais si on en ajoute une, il faudra faire un `deleteMany({ ticketId })`.    |

Si jamais la suppression dans Mongo plante après celle de PostgreSQL, il reste un document « orphelin ». Ce n'est pas grave : plus personne ne le lit, et on peut le nettoyer plus tard.

## 4. Au-delà de MongoDB : deux autres familles NoSQL

**Clé-valeur, avec Redis**

- **Le besoin :** « Le support veut savoir tout de suite si un serveur répond encore, sans attendre le prochain relevé. »
- **L'idée :** chaque serveur envoie un petit signal toutes les 10 secondes. L'info s'efface toute seule au bout de 30 secondes (TTL). Si elle a disparu, c'est que le serveur ne répond plus.
- **Pourquoi pas PostgreSQL ou MongoDB :** il y aurait énormément d'écritures qui ne servent à rien après 30 secondes, et on ne veut lire qu'une seule valeur à chaque fois. Redis est fait pour ça : c'est très rapide et ça oublie tout seul.
- **À quoi ressemble la donnée :** `heartbeat:serveur:1` → `"2026-10-29T09:00:10Z"` (expire après 30 s).

**Graphe, avec Neo4j**

- **Le besoin :** « Si un switch ou une baie tombe en panne à Lyon, quels clients sont touchés ? »
- **L'idée :** on part du matériel en panne et on suit les liens : switch → serveurs → abonnements → clients.
- **Pourquoi pas PostgreSQL ou MongoDB :** en SQL, il faudrait enchaîner plein de jointures (et on ne sait pas à l'avance combien), ça devient lourd. MongoDB n'est pas fait pour suivre des liens. Une base graphe est faite exactement pour ça.
- **À quoi ressemble la donnée :** des points comme `(:Switch {nom:"sw-lyo-02"})`, `(:Serveur {id:9})`, `(:Client {id:3})`, reliés par des flèches `[:ALIMENTE]`, `[:HEBERGE]`, `[:SOUSCRIT]`.

J'ai réécrit ce fichier avec Claude pour qu'il soit plus facilement lisible et pour le mettre au format .md.
