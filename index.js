require("dotenv").config();

const express = require("express");
const conexion = require("./configuracion/connectiondb");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Servidor SIGIF funcionando");
});

conexion
    .then(() => {
        console.log("Conexion exitosa a MongoDB");
    })
    .catch((error) => {
        console.log("Error conectando a MongoDB:");
        console.log(error);
    });

app.listen(1514, () => {
    console.log("Servidor conectado en puerto 1514");
});