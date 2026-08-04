const mongoose = require("mongoose");

const URI = process.env.MONGOURI;

const conexion = mongoose.connect(URI);

module.exports = conexion;