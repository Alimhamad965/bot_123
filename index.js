import pkg from '@whiskeysockets/baileys';
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeInMemoryStore, 
    jidDecode 
} = pkg;

import pino from 'pino';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { config } from './src/config/config.js';
import { handleMessage } from './src/handlers/messageHandler.js';

// إنشاء المخزن (Store) بشكل صحيح
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionName);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.log(`Starting Bot using WhatsApp Web v${version.join('.')}, isLatest: ${isLatest}`);

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

    // كود الربط (Pairing Code)
    if (!sock.authState.creds.registered) {
        const phoneNumber = config.ownerNumber;
        if (phoneNumber && phoneNumber !== '249xxxxxxxxx') {
            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(phoneNumber);
                    console.log(`\n\n==== PAIRING CODE ==== \nYour code is: ${code}\n======================\n\n`);
                } catch (e) {
                    console.error("Failed to request pairing code", e);
                }
            }, 3000);
        }
    }

    store.bind(sock.ev);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if(qr) {
            console.log('Scan the QR code below or check pairing code in logs:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                startBot();
            }
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

startBot().catch(err => console.error("Error starting bot:", err));
