// Jeu d'essai MongoDB. À lancer depuis la racine du projet :  node scripts/seed-mongo.js
// Il vide les 3 collections puis les remplit. Les id utilisés sont ceux de database/seed.sql.
require("dotenv").config();
const mongoose = require("mongoose");

const FicheTechnique = require("../src/models/FicheTechnique");
const Evenement = require("../src/models/Evenement");
const Message = require("../src/models/Message");

// ---------- N1 : une fiche par offre (offres 1 à 8 de seed.sql) ----------
const fiches = [
    { offreId: 1, categorie: "VPS", vcpu: 1, ramGo: 2, stockageGo: 40, typeStockage: "SSD", os: "Ubuntu 24.04" },
    { offreId: 2, categorie: "VPS", vcpu: 4, ramGo: 8, stockageGo: 160, typeStockage: "NVMe", os: "Debian 12", autres: { ipv6: true } },
    { offreId: 3, categorie: "hebergement mutualise", stockageGo: 10, nbSitesMax: 1, certificatSsl: true },
    { offreId: 4, categorie: "hebergement mutualise", stockageGo: 100, nbSitesMax: 10, certificatSsl: true, autres: { sauvegardeQuotidienne: true } },
    { offreId: 5, categorie: "serveur dedie", processeur: "AMD Ryzen 7 7700", ramGo: 64, bandePassanteGbps: 1,
      disques: [{ typeDisque: "NVMe", capaciteGo: 1000 }, { typeDisque: "NVMe", capaciteGo: 1000 }] },
    { offreId: 6, categorie: "serveur dedie", processeur: "Intel Xeon Gold 6430", ramGo: 256, bandePassanteGbps: 10,
      disques: [{ typeDisque: "NVMe", capaciteGo: 2000 }, { typeDisque: "HDD", capaciteGo: 8000 }] },
    { offreId: 7, categorie: "nom de domaine", extension: ".fr", registrar: "AFNIC", dureeEngagementMois: 12 },
    { offreId: 8, categorie: "VPS", vcpu: 1, ramGo: 1, stockageGo: 20, typeStockage: "HDD", os: "CentOS 7" },
];

// ---------- N2 : 64 événements = 8 serveurs x 8 jours ----------
// Les serveurs choisis sont ceux qui ont un abonnement dans seed.sql
const serveurs = [1, 2, 4, 9, 10, 15, 16, 17];

function creerEvenements() {
    const evenements = [];

    for (let jour = 0; jour < 8; jour++) {
        serveurs.forEach((serveurId, i) => {
            // Du 20 au 27 octobre 2026, à une heure différente selon le serveur
            const date = new Date(Date.UTC(2026, 9, 20 + jour, 6 + i, 15));
            const choix = (jour + i) % 8; // pour varier les types de façon régulière

            if (choix === 0) {
                evenements.push({ serveurId, date, type: "alerte", niveau: "critique", message: "CPU au-dessus de 95 % pendant 10 minutes" });
            } else if (choix === 1) {
                evenements.push({ serveurId, date, type: "alerte", niveau: "avertissement", message: "Disque rempli à 85 %" });
            } else if (choix === 2) {
                evenements.push({ serveurId, date, type: "redemarrage", planifie: true, motif: "Mise à jour du noyau" });
            } else if (choix === 3) {
                evenements.push({ serveurId, date, type: "maintenance", description: "Remplacement d'un ventilateur", dureeMinutes: 45, technicienId: 1 });
            } else {
                // La moitié des événements sont des relevés de métriques, comme dans la réalité
                evenements.push({ serveurId, date, type: "metrique", cpu: 20 + choix * 9, ram: 40 + i * 5, disque: 50 + jour * 3 });
            }
        });
    }

    return evenements;
}

// ---------- N3 : des fils de messages (tickets et personnes de seed.sql) ----------
const messages = [
    // Ticket 1 : client 1, technicien 1, en cours
    { ticketId: 1, auteur: { role: "client", id: 1 }, date: "2026-10-27T08:16:00Z", contenu: "Mon VPS ne répond plus du tout, même en SSH." },
    { ticketId: 1, auteur: { role: "technicien", id: 1 }, date: "2026-10-27T08:40:00Z", contenu: "Je regarde. Le serveur semble bloqué, je tente un redémarrage." },
    { ticketId: 1, auteur: { role: "technicien", id: 1 }, date: "2026-10-27T09:30:00Z", contenu: "Redémarrage effectué, pouvez-vous vérifier ?",
      piecesJointes: [{ nom: "logs-boot.txt", url: "https://files.paleonis.fr/t1/logs-boot.txt" }] },
    { ticketId: 1, auteur: { role: "client", id: 1 }, date: "2026-10-27T09:45:00Z", contenu: "Ça remarche, merci !" },

    // Ticket 2 : client 3, technicien 3, ouvert
    { ticketId: 2, auteur: { role: "client", id: 3 }, date: "2026-10-26T14:31:00Z", contenu: "Nos sites sont très lents depuis hier soir.",
      piecesJointes: [{ nom: "capture-lenteur.png", url: "https://files.paleonis.fr/t2/capture-lenteur.png" }] },
    { ticketId: 2, auteur: { role: "technicien", id: 3 }, date: "2026-10-26T15:10:00Z", contenu: "Bien reçu, j'analyse les métriques du serveur." },

    // Ticket 4 : client 6, technicien 4, résolu
    { ticketId: 4, auteur: { role: "client", id: 6 }, date: "2026-10-10T09:46:00Z", contenu: "Alerte disque à 95 %, que faire ?" },
    { ticketId: 4, auteur: { role: "technicien", id: 4 }, date: "2026-10-10T11:00:00Z", contenu: "J'ai purgé les anciens journaux, le disque est à 60 %." },

    // Ticket 5 : client 4, technicien 3, FERMÉ (pour tester le refus 409)
    { ticketId: 5, auteur: { role: "client", id: 4 }, date: "2026-09-02T16:21:00Z", contenu: "Pouvez-vous mettre à jour l'OS ce week-end ?" },
    { ticketId: 5, auteur: { role: "technicien", id: 3 }, date: "2026-09-05T10:00:00Z", contenu: "Mise à jour faite, je ferme le ticket." },

    // Ticket 6 : client 7, technicien 2, en cours
    { ticketId: 6, auteur: { role: "client", id: 7 }, date: "2026-10-20T11:11:00Z", contenu: "Pourquoi mon hébergement est-il suspendu ?" },
    { ticketId: 6, auteur: { role: "technicien", id: 2 }, date: "2026-10-20T14:00:00Z", contenu: "Un paiement a été refusé, je vous mets en relation avec la facturation." },
];

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connecté à MongoDB");

    // 1. On vide les collections
    await FicheTechnique.deleteMany({});
    await Evenement.deleteMany({});
    await Message.deleteMany({});

    // 2. On remplit. On passe par les mêmes fonctions que l'API, donc les mêmes validations.
    for (const fiche of fiches) {
        const { offreId, categorie, ...champs } = fiche;
        await FicheTechnique.remplacer(offreId, categorie, champs);
    }

    const evenements = creerEvenements();
    for (const evenement of evenements) {
        await Evenement.enregistrer(evenement.serveurId, evenement);
    }

    await Message.insertMany(messages);

    console.log(`${fiches.length} fiches, ${evenements.length} événements, ${messages.length} messages insérés`);
}

main()
    .catch((erreur) => {
        console.error("Seed impossible :", erreur.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
