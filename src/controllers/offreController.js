const Offre = require("../models/Offre");
const FicheTechnique = require("../models/FicheTechnique");

// Renvoie l'id sous forme de nombre s'il est valide, sinon null
function lireId(valeur) {
    const id = Number(valeur);
    return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

function estTexteRempli(valeur) {
    return typeof valeur === "string" && valeur.trim() !== "";
}

// Vérifie le body d'une offre (POST et PUT) : renvoie { code, message } si invalide, sinon null
function verifierOffre(donnees) {
    const { nom, categorie, prix_mensuel_ht, en_vente } = donnees ?? {};

    if (nom === undefined || categorie === undefined || prix_mensuel_ht === undefined || en_vente === undefined) {
        return { code: 400, message: "Champs obligatoires : nom, categorie, prix_mensuel_ht, en_vente" };
    }
    if (!estTexteRempli(nom) || nom.trim().length > 150) {
        return { code: 422, message: "Le nom doit faire entre 1 et 150 caractères" };
    }
    if (!Offre.CATEGORIES.includes(categorie)) {
        return { code: 422, message: `Catégorie invalide. Valeurs autorisées : ${Offre.CATEGORIES.join(", ")}` };
    }
    // numeric(10,2) en base : prix maximum 99 999 999.99
    if (!(typeof prix_mensuel_ht === "number" && prix_mensuel_ht >= 0 && prix_mensuel_ht < 100000000)) {
        return { code: 422, message: "prix_mensuel_ht doit être un nombre positif" };
    }
    if (typeof en_vente !== "boolean") {
        return { code: 422, message: "en_vente doit valoir true ou false" };
    }
    return null;
}

class OffreController {
    static async getAll(req, res){
        try{
           const offres = await Offre.findAll();
            res.json(offres);
        } catch(erreur){
            res.status(500).json({ erreur: "Erreur serveur" })
        }
    }

    static async getById(req, res){
        try{
            const id = lireId(req.params.id);
            if(!id){
                return res.status(400).json({ erreur: "Id d'offre invalide" });
            }
            const offres = await Offre.findById(id);
            if(!offres){
                return res.status(404).json({ erreur: "Offre introuvable" });
            }
            // Réponse construite à partir des deux bases : l'offre (PostgreSQL) + sa fiche technique (MongoDB)
            const fiche = await FicheTechnique.findByOffre(id);
            res.json({ ...offres, fiche_technique: fiche })
        } catch(erreur){
            res.status(500).json({ erreur: "Erreur serveur" })
        }
    }

    static async create(req, res){
        try{
            const donnees = req.body;
            const invalide = verifierOffre(donnees);
            if(invalide){
                return res.status(invalide.code).json({ erreur: invalide.message });
            }
            const offres = await Offre.create(donnees);
            res.status(201).json(offres);
        }catch(erreur){
            res.status(500).json({ erreur: "Erreur serveur" });
        }
    }

    static async update(req, res){
        try{
            const id = lireId(req.params.id);
            if(!id){
                return res.status(400).json({ erreur: "Id d'offre invalide" });
            }
            const donnees = req.body;
            const invalide = verifierOffre(donnees);
            if(invalide){
                return res.status(invalide.code).json({ erreur: invalide.message });
            }
            const offres = await Offre.update(id,donnees);
            if(!offres){
                return res.status(404).json({ erreur: "Offre introuvable" });
            }
            res.json(offres)
        }catch(erreur){
            res.status(500).json({ erreur: "Erreur serveur" });
        }
    }

    static async delete(req, res){
        try{
            const id = lireId(req.params.id);
            if(!id){
                return res.status(400).json({ erreur: "Id d'offre invalide" });
            }
            const offres = await Offre.delete(id);
            if(!offres){
                return res.status(404).json({ erreur: "Offre introuvable" });
            }
            // L'offre est supprimée dans PostgreSQL : on supprime aussi sa fiche dans MongoDB.
            // Si ça échoue, l'offre reste supprimée et la fiche devient orpheline (sans danger, voir docs/arbitrage.md).
            try {
                await FicheTechnique.deleteOne({ offreId: id });
            } catch (erreurMongo) {
                console.error(`Fiche technique de l'offre ${id} non supprimée :`, erreurMongo.message);
            }
            res.status(200).json({message: "Supprimée avec succès"});
        }catch(erreur){
            // 23001 (ON DELETE RESTRICT) ou 23503 (sans ON DELETE) : l'offre est encore utilisée par un abonnement
            if(erreur.code === "23001" || erreur.code === "23503"){
                return res.status(409).json({ erreur: "Offre utilisée par un abonnement, suppression impossible" });
            }
            res.status(500).json({ erreur: "Erreur serveur" });
        }
    }
}

module.exports = OffreController;
