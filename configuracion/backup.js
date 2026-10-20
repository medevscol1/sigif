const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs/promises');
const path = require('path');

require('dotenv').config();

const execFileAsync = promisify(execFile);

exports.backupDatabase = async () => {
    const mongoUri = process.env.MONGOURI || process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error('Falta configurar MONGOURI (o MONGO_URI) para realizar el respaldo.');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupRoot = process.env.BACKUP_DIR || path.resolve(__dirname, '../backup/daily');
    const outputPath = path.join(backupRoot, timestamp);
    await fs.mkdir(outputPath, { recursive: true });

    const { stdout, stderr } = await execFileAsync('mongodump', [
        '--uri', mongoUri,
        '--out', outputPath,
        '--gzip'
    ]);

    console.log(`Respaldo completado en ${outputPath}`);
    if (stdout) console.log(stdout.trim());
    if (stderr) console.warn(stderr.trim());
    return outputPath;
};
