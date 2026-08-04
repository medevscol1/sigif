require("dotenv").config(); // Carga variables de entorno desde el archivo .env

const express = require("express"); // Importa Express para crear el servidor HTTP
const conexion = require("./configuracion/connectiondb"); // Importa la conexión a MongoDB

const app = express(); // Crea la instancia de la aplicación Express

app.use(express.json()); // Habilita el parseo de JSON en el cuerpo de las peticiones

app.get("/", (req, res) => {
    res.send("Servidor SIGIF funcionando"); // Responde en la ruta raíz con un mensaje de estado
});

conexion
    .then(() => {
        console.log("Conexion exitosa a MongoDB"); // Mensaje cuando la conexión a MongoDB es exitosa
    })
    .catch((error) => {
        console.log("Error conectando a MongoDB:"); // Muestra el error si la conexión falla
        console.log(error);
    });

app.listen(1514, () => {
    console.log("Servidor conectado en puerto 1514"); // Inicia el servidor en el puerto 1514
});