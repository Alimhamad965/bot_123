import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    jidDecode,
    getAggregateVotesInPollMessage
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import fs from 'fs';
import qrcode from 'qrcode-terminal';
import { config } from './src/config/config.js';
import { handleMessage } from './src/handlers/messageHandler.js';

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

    // Pairing Code logic for environments without terminal QR access
    if (!sock.authState.creds.registered) {
        const phoneNumber = config.ownerNumber; // Usage: Ensure this is set in config
        if (phoneNumber && phoneNumber !== '249xxxxxxxxx') {
            setTimeout(async () => {
                let code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n\n==== PAIRING CODE ==== \nYour code is: ${code}\n======================\n\n`);
            }, 3000);
        }
    }

    store.bind(sock.ev);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('Scan the QR code below to connect:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
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

    sock.ev.on('group-participants.update', async (anu) => {
        console.log(anu);
        try {
            let metadata = await sock.groupMetadata(anu.id);
            let participants = anu.participants;
            for (let num of participants) {
                if (anu.action == 'add') {
                    const welcomeMsg = `أهلاً بك يا @${num.split("@")[0]} في مجموعة ${metadata.subject}! 🎉\n\nاستخدم !help لرؤية الأوامر.`;
                    await sock.sendMessage(anu.id, {
                        text: welcomeMsg,
                        mentions: [num]
                    });
                }
            }
        } catch (err) {
            console.log(err);
        }
    });

    return sock;
}

startBot().catch(err => console.error("Error starting bot:", err));
