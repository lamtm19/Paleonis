require("dotenv").config();
const pool = require("./config/db");
const connectMongo = require("./config/mongo");
const gestionErreurs = require("./middlewares/erreurs");

const express = require("express");
const app = express();

const productRoutes = require("./routes/product.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

const datacenterRoutes = require("./routes/datacenterRoutes");
const technicienRoutes = require("./routes/technicienRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const offreRoutes = require("./routes/offreRoutes");
const serveurRoutes = require("./routes/serveurRoutes");

app.use(express.json());

app.use("/api/products", productRoutes);
app.use("/api/dashboard", dashboardRoutes); 
app.use("/api/datacenters", datacenterRoutes);
app.use("/api/technicians", technicienRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/catalog", offreRoutes);
app.use("/api/servers", serveurRoutes);

// Le 404 reste TOUJOURS en dernier
app.use((req, res) => {
    res.status(404).json({ message: "Page introuvable" });
});

// Le middleware d'erreurs se déclare après toutes les routes
app.use(gestionErreurs);

// On se connecte aux deux bases AVANT d'ouvrir le serveur.
// Si l'une des deux échoue, on arrête tout : une API à moitié connectée est pire qu'une API éteinte.
async function demarrer() {
    try {
        await pool.query("SELECT NOW()");
        console.log("Connecté à PostgreSQL !");

        await connectMongo();

        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Serveur lance sur le port ${port}`);
        });
    } catch (erreur) {
        console.error("Démarrage impossible :", erreur.message);
        process.exit(1);
    }
}

demarrer();