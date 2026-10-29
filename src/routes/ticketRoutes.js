const router = require("express").Router();

const ticketController = require("../controllers/ticketController");

router.post("/", ticketController.createTicket);
router.get("/:id", ticketController.getTicket);
router.patch("/:id/assign", ticketController.assignTicket);
router.patch("/:id/status", ticketController.updateStatutTicket);

// N3 : messages sur un ticket (MongoDB)
router.post("/:id/messages", ticketController.addMessage);

module.exports = router;
