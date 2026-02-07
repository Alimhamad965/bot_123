import pkg from '@whiskeysockets/baileys';
// هذه الطريقة تضمن الوصول للوظائف حتى لو اختلفت نسخة المكتبة
const makeWASocket = pkg.default || pkg;
const useMultiFileAuthState = pkg.useMultiFileAuthState || pkg.default?.useMultiFileAuthState;
const makeInMemoryStore = pkg.makeInMemoryStore || pkg.default?.makeInMemoryStore;
const fetchLatestBaileysVersion = pkg.fetchLatestBaileysVersion || pkg.default?.fetchLatestBaileysVersion;
const DisconnectReason = pkg.DisconnectReason || pkg.default?.DisconnectReason;

import pino from 'pino';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { config } from './src/config/config.js';
import { handleMessage } from './src/handlers/messageHandler.js';

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionName);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.log(`Starting Bot using WhatsApp Web v${version.join('.')}`);

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ["Antigravity Bot", "MacOS", "3.0.0"],
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg?.message || undefined;
            }
            return { conversation: 'hello' };
        }
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = config.ownerNumber;
        if (phoneNumber && phoneNumber !== '249xxxxxxxxx') {
            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(phoneNumber);
                    console.log(`\n\n==== PAIRING CODE ==== \nYour code is: ${code}\n======================\n\n`);
                } catch (e) {
                    console.error("Pairing code error:", e);
                }
            }, 6000);
        }
    }

    store.bind(sock.ev);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if(qr) qrcode.generate(qr, { small: true });

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('Bot successfully connected to WhatsApp!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
            if (!msg.message) continue;
            await handleMessage(sock, msg);
        }
    });

    return sock;
}

startBot().catch(err => console.error(err));

