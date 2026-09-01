require("dotenv").config(); // Carga variables de entorno desde el archivo .env

const express = require("express"); // Importa Express para crear el servidor HTTP
const conexion = require("./configuracion/connectiondb"); // Importa la conexión a MongoDB

const app = express(); // Crea la instancia de la aplicación Express

app.use(express.json()); // Habilita el parseo de JSON en el cuerpo de las peticiones

// Ruta raíz: responde con un mensaje indicando que el servidor está activo
app.get("/", (req, res) => {
    res.send("Servidor SIGIF funcionando");
});

// Maneja el resultado de la promesa de conexión a MongoDB
conexion
    .then(() => {
        console.log("Conexion exitosa a MongoDB"); // Se ejecuta cuando la conexión es exitosa
    })
    .catch((error) => {
        console.log("Error conectando a MongoDB:"); // Se ejecuta cuando hay un error al conectar
        console.log(error);
    });

app.listen(1514, () => {
    console.log("Servidor conectado en puerto https: //localhost:1514"); // Inicia el servidor en el puerto 1514
});