const Serveur = require("../models/Serveur");
const Evenement = require("../models/Evenement");

// Renvoie l'id sous forme de nombre s'il est valide, sinon null
function lireId(valeur) {
    const id = Number(valeur);
    return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

// Transforme un texte en date, ou renvoie null si ce n'est pas une date valide
function lireDate(valeur) {
    const date = new Date(valeur);
    return isNaN(date.getTime()) ? null : date;
}

// Vérifie l'id du serveur ET son existence dans PostgreSQL.
// Renvoie l'id si tout va bien, sinon envoie la réponse d'erreur et renvoie null.
async function verifierServeur(req, res) {
    const id = lireId(req.params.id);

    if (!id) {
        res.status(400).json({ message: "Id de serveur invalide" });
        return null;
    }

    const serveur = await Serveur.findById(id);
    if (!serveur) {
        res.status(404).json({ message: "Serveur introuvable" });
        return null;
    }

    return id;
}

// POST /api/servers/:id/evenements
exports.createEvenement = async (req, res) => {
    const { type } = req.body ?? {};

    if (!type) {
        return res.status(400).json({ message: "Le champ type est obligatoire" });
    }
    if (!Evenement.TYPES.includes(type)) {
        return res.status(422).json({ message: `Type invalide. Valeurs autorisées : ${Evenement.TYPES.join(", ")}` });
    }

    const serveurId = await verifierServeur(req, res);
    if (!serveurId) return;

    // Les champs obligatoires selon le type sont vérifiés par Mongoose (ValidationError -> 422)
    const evenement = await Evenement.enregistrer(serveurId, req.body);

    res.status(201).json(evenement);
};

// GET /api/servers/:id/evenements?type=alerte&debut=2026-10-01&fin=2026-10-31&limite=20
exports.listEvenements = async (req, res) => {
    const { type, debut, fin, limite } = req.query;

    if (type && !Evenement.TYPES.includes(type)) {
        return res.status(422).json({ message: `Type invalide. Valeurs autorisées : ${Evenement.TYPES.join(", ")}` });
    }

    const dateDebut = debut ? lireDate(debut) : null;
    const dateFin = fin ? lireDate(fin) : null;
    if ((debut && !dateDebut) || (fin && !dateFin)) {
        return res.status(400).json({ message: "debut et fin doivent être des dates, par exemple 2026-10-27" });
    }

    // Par défaut 50 résultats, au maximum 500
    const nombre = limite === undefined ? 50 : lireId(limite);
    if (!nombre || nombre > 500) {
        return res.status(400).json({ message: "limite doit être un entier entre 1 et 500" });
    }

    const serveurId = await verifierServeur(req, res);
    if (!serveurId) return;

    const evenements = await Evenement.lister(serveurId, { type, debut: dateDebut, fin: dateFin, limite: nombre });

    res.status(200).json(evenements);
};

// GET /api/servers/:id/evenements/stats
exports.statsEvenements = async (req, res) => {
    const serveurId = await verifierServeur(req, res);
    if (!serveurId) return;

    const stats = await Evenement.statistiques(serveurId);

    res.status(200).json({ serveurId, parType: stats });
};
