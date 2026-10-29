// Middleware d'erreurs global : toute erreur non gérée par un controller arrive ici.
// Express le reconnaît comme middleware d'erreurs parce qu'il a 4 paramètres (err, req, res, next).
function gestionErreurs(err, req, res, next) {
    // JSON mal écrit dans le body de la requête
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Le body n'est pas un JSON valide" });
    }

    // ----- Erreurs PostgreSQL (err.code) -----
    if (err.code === "23505") {
        return res.status(409).json({ message: "Cette valeur existe déjà" });
    }
    if (err.code === "23503" || err.code === "23001") {
        return res.status(409).json({ message: "Opération impossible : une donnée liée l'empêche" });
    }
    if (err.code === "23514") {
        return res.status(422).json({ message: "Valeur refusée par une contrainte de la base" });
    }
    if (err.code === "22P02") {
        return res.status(400).json({ message: "Format de donnée invalide" });
    }

    // ----- Erreurs MongoDB / Mongoose -----
    if (err.name === "ValidationError") {
        // On liste chaque champ refusé avec son message, pour aider celui qui appelle l'API
        const details = Object.values(err.errors).map((e) => ({ champ: e.path, message: e.message }));
        return res.status(422).json({ message: "Données invalides", details });
    }
    if (err.name === "CastError") {
        return res.status(400).json({ message: `Valeur invalide pour le champ ${err.path}` });
    }
    if (err.code === 11000) {
        return res.status(409).json({ message: "Cette valeur existe déjà" });
    }

    // Erreur imprévue : on l'affiche dans le terminal, mais on ne montre pas les détails au client
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
}

module.exports = gestionErreurs;
