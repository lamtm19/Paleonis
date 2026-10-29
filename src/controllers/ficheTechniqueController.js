const Offre = require("../models/Offre");
const FicheTechnique = require("../models/FicheTechnique");

// Renvoie l'id sous forme de nombre s'il est valide, sinon null
function lireId(valeur) {
    const id = Number(valeur);
    return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

// PUT /api/catalog/:id/fiche : crée ou remplace la fiche technique d'une offre
exports.putFiche = async (req, res) => {
    const id = lireId(req.params.id);

    if (!id) {
        return res.status(400).json({ message: "Id d'offre invalide" });
    }

    const donnees = req.body;
    if (!donnees || typeof donnees !== "object" || Array.isArray(donnees)) {
        return res.status(400).json({ message: "Le body doit être un objet JSON" });
    }

    // Lien entre les deux bases : MongoDB ne sait pas si l'offre existe, on le vérifie dans PostgreSQL
    const offre = await Offre.findById(id);
    if (!offre) {
        return res.status(404).json({ message: "Offre introuvable" });
    }

    const existait = await FicheTechnique.findByOffre(id);

    // La catégorie vient de PostgreSQL, jamais du body : c'est elle qui décide quels champs sont obligatoires.
    // Si la fiche est invalide, Mongoose lance une ValidationError -> le middleware d'erreurs répond 422.
    const fiche = await FicheTechnique.remplacer(id, offre.categorie, donnees);

    res.status(existait ? 200 : 201).json(fiche);
};
