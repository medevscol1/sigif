const fs = require('fs');

exports.leerArchivo =async()=> {
  try {
    const contenido = await fs.promises.readFile('../registro.log', 'utf-8');
    const logEntry = `${new Date().toLocaleDateString()} ${new Date(). toLocaleTimeString()} - Se leyo el archivo registro.log \n`;
    await fs.promises.appendFile('./registro.log', logEntry)
    /// fs.promises.rename('./registro.log', 'moyagay');
    console.log(contenido);
  } catch (error) {
    console.error('Error al leer el archivo:', error);
  }
}

  exports.escribirArchivo= async(accion, usuario)=> {
  try {
    await fs.promises.appendFile('./datos.txt', 'Hola, este es mi archivo');
    console.log('Archivo creado correctamente');
    const logEntry = `${new Date().toLocaleDateString()} ${new Date(). toLocaleTimeString()} - Accion: ${accion} - Usuario ejecutor: ${usuario} \n`;
    await fs.promises.appendFile('./registro.log', logEntry)
  } catch (error) {
    console.error('Error al crear el archivo:', error);
  }
}

  exports.infoArchivo =()=> {
      //  const contenido = await fs.promises.('./registro.log', 'utf-8');
    
}


