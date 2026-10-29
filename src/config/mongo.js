const mongoose = require("mongoose");
async function connectMongo() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connecté à MongoDB");
}
module.exports = connectMongo;
