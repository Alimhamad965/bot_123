import { config } from '../config/config.js';
import { jokes, quotes, motivation } from '../lib/data.js';
import { startGuessNumber, handleGameTurn, startTrivia, checkTrivia, startTrueFalse, startGuessWord, checkGeneralGame } from '../lib/games.js';

export async function handleMessage(sock, msg) {
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = isGroup ? msg.key.participant : from;
    const pushName = msg.pushName || 'User';

    // Message Body extraction
    const body = msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption || '';

    const prefix = config.prefix;
    const isCmd = body.startsWith(prefix);
    const command = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : '';
    const args = body.trim().split(/ +/).slice(1);
    const text = args.join(' ');

    // Auto Replies & Smart Chat
    if (!isCmd) {
        // Game handling for non-command messages
        const triviaResult = checkTrivia(sender, body);
        if (triviaResult) {
            return await sock.sendMessage(from, { text: triviaResult }, { quoted: msg });
        }

        const guessResult = handleGameTurn(sender, body);
        if (guessResult) {
            return await sock.sendMessage(from, { text: guessResult }, { quoted: msg });
        }

        const generalGameResult = checkGeneralGame(sender, body);
        if (generalGameResult) {
            return await sock.sendMessage(from, { text: generalGameResult }, { quoted: msg });
        }

        // Basic greeting auto-replies
        const lowerBody = body.toLowerCase();
        if (lowerBody.includes('سلام') || lowerBody.includes('hi') || lowerBody.includes('hello')) {
            await sock.sendMessage(from, { text: `وعليكم السلام يا ${pushName}! كيف يمكنني مساعدتك؟ استخدم !help لرؤية الأوامر.` });
            await sock.sendMessage(from, { react: { text: '👋', key: msg.key } });
        }
        return;
    }

    console.log(`[COMMAND] ${command} from ${pushName} (${sender})`);

    switch (command) {
        case 'ping':
            await sock.sendMessage(from, { text: 'Pong! 🏓' }, { quoted: msg });
            break;

        case 'help':
        case 'menu':
            const helpText = `
🤖 *${config.botName}* القائمة الأوامر

*الترفيه والألعاب:*
- !joke : نكتة مضحكة
- !quote : حكمة اليوم
- !motivation : رسالة تحفيزية
- !guess : لعبة تخمين الرقم
- !trivia : سؤال وجواب
- !tf : صح أم خطأ
- !word : خمن الكلمة المبعثرة
- !mood : فحص المزاج
- !pick [خيارات] : الاختيار العشوائي

*الأدوات:*
- !time : الوقت الحالي
- !ping : فحص سرعة الاستجابة
- !help : عرض هذه القائمة

استخدم البادئة (${prefix}) قبل كل أمر.
            `;
            await sock.sendMessage(from, { text: helpText }, { quoted: msg });
            break;

        case 'joke':
            const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
            await sock.sendMessage(from, { text: randomJoke }, { quoted: msg });
            break;

        case 'quote':
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            await sock.sendMessage(from, { text: randomQuote }, { quoted: msg });
            break;

        case 'motivation':
            const randomMotiv = motivation[Math.floor(Math.random() * motivation.length)];
            await sock.sendMessage(from, { text: randomMotiv }, { quoted: msg });
            break;

        case 'guess':
            const guessMsg = startGuessNumber(sender);
            await sock.sendMessage(from, { text: guessMsg }, { quoted: msg });
            break;

        case 'trivia':
            const triviaMsg = startTrivia(sender);
            await sock.sendMessage(from, { text: triviaMsg }, { quoted: msg });
            break;

        case 'tf':
            const tfMsg = startTrueFalse(sender);
            await sock.sendMessage(from, { text: tfMsg }, { quoted: msg });
            break;

        case 'word':
            const wordMsg = startGuessWord(sender);
            await sock.sendMessage(from, { text: wordMsg }, { quoted: msg });
            break;

        case 'pick':
            if (args.length < 2) return await sock.sendMessage(from, { text: 'الرجاء إدخال خيارين على الأقل. مثال: !pick شاي قهوة' }, { quoted: msg });
            const choice = args[Math.floor(Math.random() * args.length)];
            await sock.sendMessage(from, { text: `أنا أختار: ${choice} 🎯` }, { quoted: msg });
            break;

        case 'mood':
            const moods = ['سعيد جداً 😊', 'رايق 😎', 'نص نص 😐', 'زعلان شوي 😔', 'داير مشاكل 👺'];
            const mood = moods[Math.floor(Math.random() * moods.length)];
            await sock.sendMessage(from, { text: `مزاجك اليوم هو: ${mood}` }, { quoted: msg });
            break;

        case 'time':
            const now = new Date();
            await sock.sendMessage(from, { text: `الوقت الآن: ${now.toLocaleTimeString('ar-EG')}` }, { quoted: msg });
            break;

        default:
            // Optional: log unknown command
            break;
    }
}
