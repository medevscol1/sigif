const mongoose = require("mongoose"); // Importa Mongoose para conectar con MongoDB

const URI = process.env.MONGOURI; // Lee la URI de MongoDB desde las variables de entorno

const conexion = mongoose.connect(URI); // Inicia la conexión a MongoDB y devuelve una promesa

module.exports = conexion; // Exporta la promesa de conexión para usarla en la aplicación
