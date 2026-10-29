# PaLeonis : API hybride PostgreSQL + MongoDB

API Express (architecture MVC) de l'espace client PaLeonis.
- **PostgreSQL** : clients, offres, abonnements, serveurs, tickets (TP 3).
- **MongoDB** : fiches techniques des offres, journal d'activité des serveurs, messages des tickets (TP 4).

Les choix entre les deux bases sont expliqués dans [docs/arbitrage.md](docs/arbitrage.md), et les routes dans [docs/endpoints.md](docs/endpoints.md).

## Prérequis

- Node.js 20 ou plus
- PostgreSQL 16
- MongoDB 7

## 1. Lancer les deux bases

Avec Docker :
```
docker run --name paleonis-db -e POSTGRES_USER=paleonis -e POSTGRES_PASSWORD=paleonis -e POSTGRES_DB=paleonis -p 5432:5432 -d postgres:16
docker run --name paleonis-mongo -p 27017:27017 -d mongo:7
```
Sans Docker : installer PostgreSQL (créer une base `paleonis`) et MongoDB Community Server.

## 2. Configurer

```
npm install
```
Copier `.env.example` en `.env` et le remplir :
```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=paleonis
DB_PASSWORD=paleonis
DB_NAME=paleonis
MONGO_URI=mongodb://localhost:27017/paleonis
```

## 3. Charger les jeux d'essai

PostgreSQL (d'abord le schéma, puis les données) :
```
docker exec -i paleonis-db psql -U paleonis -d paleonis < database/schema.sql
docker exec -i paleonis-db psql -U paleonis -d paleonis < database/seed.sql
```
Sans Docker, exécuter les deux fichiers dans pgAdmin (Query Tool sur la base `paleonis`).

MongoDB (à lancer **après** le seed PostgreSQL, car il réutilise ses id) :
```
node scripts/seed-mongo.js
```
Il affiche `8 fiches, 64 événements, 12 messages insérés`.

## 4. Lancer l'API

```
npm run dev
```
Le terminal doit afficher :
```
Connecté à PostgreSQL !
Connecté à MongoDB
Serveur lance sur le port 3000
```
Si l'une des deux bases est injoignable, l'API s'arrête avec `Démarrage impossible : ...`.

## 5. Tester

Importer la collection [postman/paleonis.postman_collection.json](postman/paleonis.postman_collection.json) dans Postman.
Quelques URL pour vérifier rapidement :
- `GET http://localhost:3000/api/catalog/1` : une offre avec sa fiche technique
- `GET http://localhost:3000/api/servers/1/evenements/stats` : statistiques d'un serveur
- `GET http://localhost:3000/api/tickets/1` : un ticket avec son fil de messages
