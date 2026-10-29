const { Schema, model } = require("mongoose");

// Partie commune à toutes les fiches, quelle que soit la catégorie
const ficheSchema = new Schema(
    {
        offreId: { type: Number, required: true, unique: true }, // id PostgreSQL de l'offre
        autres: { type: Schema.Types.Mixed, default: {} },        // caractéristiques libres ajoutées par le commercial
    },
    {
        timestamps: true,              // ajoute createdAt et updatedAt
        discriminatorKey: "categorie", // le champ qui dit quelle "sous-fiche" utiliser
    }
);

const FicheTechnique = model("FicheTechnique", ficheSchema, "fiches_techniques");

// Une sous-fiche par catégorie, avec ses propres champs obligatoires.
// Les noms doivent être exactement ceux du CHECK de la table offre.
FicheTechnique.discriminator("VPS", new Schema({
    vcpu: { type: Number, required: true, min: 1 },
    ramGo: { type: Number, required: true, min: 1 },
    stockageGo: { type: Number, required: true, min: 1 },
    typeStockage: { type: String },
    os: { type: String, required: true },
}));

FicheTechnique.discriminator("hebergement mutualise", new Schema({
    stockageGo: { type: Number, required: true, min: 1 },
    nbSitesMax: { type: Number, required: true, min: 1 },
    certificatSsl: { type: Boolean, default: true },
}));

FicheTechnique.discriminator("serveur dedie", new Schema({
    processeur: { type: String, required: true },
    ramGo: { type: Number, required: true, min: 1 },
    disques: {
        type: [{ typeDisque: { type: String, required: true }, capaciteGo: { type: Number, required: true, min: 1 } }],
        validate: (disques) => disques.length > 0,
    },
    bandePassanteGbps: { type: Number, required: true, min: 0 },
}));

FicheTechnique.discriminator("nom de domaine", new Schema({
    extension: { type: String, required: true },
    registrar: { type: String, required: true },
    dureeEngagementMois: { type: Number, required: true, min: 1 },
}));

// Crée la fiche d'une offre, ou remplace celle qui existe déjà
FicheTechnique.remplacer = async function (offreId, categorie, donnees) {
    const ModeleCategorie = this.discriminators[categorie];
    const fiche = new ModeleCategorie({ ...donnees, offreId, categorie });

    await fiche.validate();                // si la fiche est invalide, on s'arrête ici, l'ancienne n'est pas touchée
    await this.deleteOne({ offreId });
    return fiche.save();
};

FicheTechnique.findByOffre = function (offreId) {
    return this.findOne({ offreId });
};

module.exports = FicheTechnique;
