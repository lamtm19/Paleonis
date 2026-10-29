const router = require("express").Router();

const ServeurController = require("../controllers/serveurController");
const evenementController = require("../controllers/evenementController");

router.get("/", ServeurController.getAll);
router.get("/:id", ServeurController.getById);
router.post("/", ServeurController.create);
router.put("/:id", ServeurController.update);
router.delete("/:id", ServeurController.delete);

// N2 : journal d'activité (MongoDB)
router.post("/:id/evenements", evenementController.createEvenement);
router.get("/:id/evenements", evenementController.listEvenements);
router.get("/:id/evenements/stats", evenementController.statsEvenements);

module.exports = router;
