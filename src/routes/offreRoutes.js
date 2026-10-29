const router = require("express").Router();

const OffreController = require("../controllers/offreController");
const ficheTechniqueController = require("../controllers/ficheTechniqueController");

router.get("/", OffreController.getAll);
router.get("/:id", OffreController.getById);
router.post("/", OffreController.create);
router.put("/:id", OffreController.update);
router.delete("/:id", OffreController.delete);

// N1 : fiche technique (MongoDB)
router.put("/:id/fiche", ficheTechniqueController.putFiche);

module.exports = router;
