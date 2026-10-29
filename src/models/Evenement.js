const { Schema, model } = require("mongoose");

// Partie commune à tous les événements
const evenementSchema = new Schema(
    {
        serveurId: { type: Number, required: true }, // id PostgreSQL du serveur
        date: { type: Date, default: Date.now },
    },
    { discriminatorKey: "type" } // le champ "type" dit quelle sous-forme utiliser
);

// On lit toujours les événements d'UN serveur, du plus récent au plus ancien : cet index rend ça rapide
evenementSchema.index({ serveurId: 1, date: -1 });

const Evenement = model("Evenement", evenementSchema, "evenements");

// Une sous-forme par type d'événement, chacune avec ses propres champs
Evenement.discriminator("redemarrage", new Schema({
    planifie: { type: Boolean, required: true },
    motif: { type: String, maxlength: 300 },
}));

Evenement.discriminator("alerte", new Schema({
    niveau: { type: String, required: true, enum: ["info", "avertissement", "critique"] },
    message: { type: String, required: true, maxlength: 500 },
}));

Evenement.discriminator("maintenance", new Schema({
    description: { type: String, required: true, maxlength: 500 },
    dureeMinutes: { type: Number, required: true, min: 1 },
    technicienId: { type: Number }, // id PostgreSQL du technicien, facultatif
}));

Evenement.discriminator("metrique", new Schema({
    cpu: { type: Number, required: true, min: 0, max: 100 },    // en %
    ram: { type: Number, required: true, min: 0, max: 100 },    // en %
    disque: { type: Number, required: true, min: 0, max: 100 }, // en %
}));

Evenement.TYPES = ["redemarrage", "alerte", "maintenance", "metrique"];

// Enregistre un événement avec la bonne sous-forme selon son type
Evenement.enregistrer = function (serveurId, donnees) {
    const ModeleType = this.discriminators[donnees.type];
    return ModeleType.create({ ...donnees, serveurId });
};

// Liste les événements d'un serveur, avec des filtres facultatifs
Evenement.lister = function (serveurId, { type, debut, fin, limite }) {
    const filtre = { serveurId };

    if (type) {
        filtre.type = type;
    }
    if (debut || fin) {
        filtre.date = {};
        if (debut) filtre.date.$gte = debut; // $gte = "supérieur ou égal"
        if (fin) filtre.date.$lte = fin;     // $lte = "inférieur ou égal"
    }

    return this.find(filtre).sort({ date: -1 }).limit(limite);
};

// Nombre d'événements par type, calculé par MongoDB lui-même
Evenement.statistiques = function (serveurId) {
    return this.aggregate([
        { $match: { serveurId } },                           // 1. on garde les événements de ce serveur
        { $group: { _id: "$type", total: { $sum: 1 } } },    // 2. on les regroupe par type et on compte
        { $project: { _id: 0, type: "$_id", total: 1 } },    // 3. on renomme _id en "type" pour que ce soit lisible
        { $sort: { total: -1 } },                            // 4. le type le plus fréquent en premier
    ]);
};

module.exports = Evenement;
