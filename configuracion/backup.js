const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs/promises');
const path = require('path');
const nodemailer = require('nodemailer');

require('dotenv').config();

const execFileAsync = promisify(execFile);

function parseBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') return fallback;
    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

exports.getBackupSettings = () => {
    const recipients = (process.env.BACKUP_EMAIL_TO || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);

    const backupDir = process.env.BACKUP_DIR || path.resolve(__dirname, '../backup');

    return {
        enabled: parseBoolean(process.env.BACKUP_ENABLED, true),
        schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
        timezone: process.env.BACKUP_TIMEZONE || 'America/Bogota',
        dir: path.resolve(process.cwd(), backupDir),
        emailEnabled: parseBoolean(process.env.BACKUP_EMAIL_ENABLED, false),
        emailHost: process.env.BACKUP_EMAIL_HOST || 'smtp.gmail.com',
        emailPort: Number(process.env.BACKUP_EMAIL_PORT || 587),
        emailSecure: parseBoolean(process.env.BACKUP_EMAIL_SECURE, false),
        emailUser: process.env.BACKUP_EMAIL_USER || '',
        emailPassword: process.env.BACKUP_EMAIL_PASSWORD || '',
        emailFrom: process.env.BACKUP_EMAIL_FROM || process.env.BACKUP_EMAIL_USER || '',
        emailTo: recipients,
        emailSubject: process.env.BACKUP_EMAIL_SUBJECT || 'SIGIF - Respaldo de base de datos',
    };
};

exports.updateBackupSettings = async (updates = {}) => {
    const current = exports.getBackupSettings();
    const values = {
        BACKUP_ENABLED: String(Boolean(updates.enabled ?? current.enabled)).toLowerCase(),
        BACKUP_SCHEDULE: updates.schedule || current.schedule,
        BACKUP_TIMEZONE: updates.timezone || current.timezone,
        BACKUP_DIR: updates.dir || current.dir,
        BACKUP_EMAIL_ENABLED: String(Boolean(updates.emailEnabled ?? current.emailEnabled)).toLowerCase(),
        BACKUP_EMAIL_HOST: updates.emailHost || current.emailHost,
        BACKUP_EMAIL_PORT: String(updates.emailPort || current.emailPort),
        BACKUP_EMAIL_SECURE: String(Boolean(updates.emailSecure ?? current.emailSecure)).toLowerCase(),
        BACKUP_EMAIL_USER: updates.emailUser || current.emailUser,
        BACKUP_EMAIL_PASSWORD: updates.emailPassword || current.emailPassword,
        BACKUP_EMAIL_FROM: updates.emailFrom || current.emailFrom,
        BACKUP_EMAIL_TO: Array.isArray(updates.emailTo)
            ? updates.emailTo.join(',')
            : (updates.emailTo || current.emailTo.join(',')),
        BACKUP_EMAIL_SUBJECT: updates.emailSubject || current.emailSubject,
    };

    const envPath = path.resolve(__dirname, '../.env');
    let existing = '';
    try {
        existing = await fs.readFile(envPath, 'utf8');
    } catch (error) {
        existing = '';
    }

    const kept = (existing || '')
        .split(/\r?\n/)
        .filter(line => !/^BACKUP_[A-Z0-9_]+\s*=/.test(line.trim()));

    const lines = [
        ...kept.filter(line => line.trim() !== ''),
        '',
        ...Object.entries(values).map(([key, value]) => `${key}=${value}`),
    ].filter((line, index, arr) => !(index === arr.length - 1 && line === ''));

    await fs.writeFile(envPath, `${lines.join('\n')}\n`, 'utf8');

    Object.entries(values).forEach(([key, value]) => {
        process.env[key] = String(value);
    });

    return exports.getBackupSettings();
};

async function createZipArchive(folderPath) {
    const parentDir = path.dirname(folderPath);
    const folderName = path.basename(folderPath);
    const zipDir = path.resolve(process.cwd(), 'backup-archives');
    const zipPath = path.join(zipDir, `${folderName}.zip`);

    await fs.mkdir(zipDir, { recursive: true });
    await execFileAsync('zip', ['-r', zipPath, folderName], { cwd: parentDir });
    return zipPath;
}

async function sendBackupByEmail(filePath, settings) {
    if (!settings.emailEnabled) return null;

    if (!settings.emailUser || !settings.emailPassword || settings.emailTo.length === 0) {
        throw new Error('Faltan BACKUP_EMAIL_USER, BACKUP_EMAIL_PASSWORD o BACKUP_EMAIL_TO para enviar backups por correo.');
    }

    const transporter = nodemailer.createTransport({
        host: settings.emailHost,
        port: settings.emailPort,
        secure: settings.emailSecure,
        auth: {
            user: settings.emailUser,
            pass: settings.emailPassword,
        },
    });

    const fecha = new Date().toLocaleString('es-CO', { timeZone: settings.timezone });
    await transporter.sendMail({
        from: settings.emailFrom || settings.emailUser,
        to: settings.emailTo.join(','),
        subject: settings.emailSubject,
        text: `Se adjunta el respaldo del sistema SIGIF generado el ${fecha}. Archivo ZIP listo para descarga.`,
        attachments: [{
            filename: path.basename(filePath),
            path: filePath,
        }],
    });

    console.log(`Backup enviado por email a: ${settings.emailTo.join(', ')}`);
    return true;
}

exports.backupDatabase = async () => {
    const mongoUri = process.env.MONGOURI || process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error('Falta configurar MONGOURI (o MONGO_URI) para realizar el respaldo.');
    }

    const settings = exports.getBackupSettings();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupRoot = settings.dir;
    const outputPath = path.join(backupRoot, timestamp);

    await fs.mkdir(outputPath, { recursive: true });

    const { stdout, stderr } = await execFileAsync('mongodump', [
        '--uri', mongoUri,
        '--out', outputPath,
        '--gzip',
    ]);

    const zipPath = await createZipArchive(outputPath);

    console.log(`Respaldo completado en ${outputPath}`);
    if (stdout) console.log(stdout.trim());
    if (stderr) console.warn(stderr.trim());

    if (settings.emailEnabled) {
        await sendBackupByEmail(zipPath, settings);
    }

    return { outputPath, zipPath };
};
