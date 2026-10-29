const { Schema, model } = require("mongoose");

const messageSchema = new Schema({
    ticketId: { type: Number, required: true }, // id PostgreSQL du ticket
    auteur: {
        role: { type: String, required: true, enum: ["client", "technicien"] },
        id: { type: Number, required: true },   // id PostgreSQL du client ou du technicien
    },
    contenu: { type: String, required: true, trim: true, maxlength: 5000 },
    date: { type: Date, default: Date.now },
    piecesJointes: [
        {
            _id: false, // pas besoin d'un id pour chaque pièce jointe
            nom: { type: String, required: true },
            url: { type: String, required: true },
        },
    ],
});

// On lit toujours le fil d'UN ticket dans l'ordre chronologique : cet index rend ça rapide
messageSchema.index({ ticketId: 1, date: 1 });

const Message = model("Message", messageSchema, "messages");

// Tout le fil d'un ticket, du plus ancien au plus récent
Message.findByTicket = function (ticketId) {
    return this.find({ ticketId }).sort({ date: 1 });
};

module.exports = Message;
