const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', 'logs');
const REGISTRO_LOG = path.join(LOGS_DIR, 'registro.log');
const DATOS_TXT = path.join(LOGS_DIR, 'datos.txt');

async function ensureLogsDir() {
    try {
        await fs.promises.mkdir(LOGS_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating logs directory:', error);
    }
}

exports.leerArchivo = async () => {
    try {
        await ensureLogsDir();
        const contenido = await fs.promises.readFile(REGISTRO_LOG, 'utf-8');
        const logEntry = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} - Se leyó el archivo registro.log\n`;
        await fs.promises.appendFile(REGISTRO_LOG, logEntry);
        console.log(contenido);
        return contenido;
    } catch (error) {
        console.error('Error al leer el archivo:', error);
        return '';
    }
};

exports.escribirArchivo = async (accion, usuario, modulo = '') => {
    try {
        await ensureLogsDir();
        const logEntry = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} - Módulo: ${modulo} - Acción: ${accion} - Usuario ejecutor: ${usuario}\n`;
        await fs.promises.appendFile(REGISTRO_LOG, logEntry);
        await fs.promises.appendFile(DATOS_TXT, `Hola, este es mi archivo - ${new Date().toLocaleString()}\n`);
        console.log('Log escrito correctamente:', logEntry.trim());
    } catch (error) {
        console.error('Error al escribir el archivo:', error);
    }
};

exports.infoArchivo = () => {
    return { logsDir: LOGS_DIR, registroLog: REGISTRO_LOG, datosTxt: DATOS_TXT };
};