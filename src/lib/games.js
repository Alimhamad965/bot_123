const activeGames = new Map();

export function startGuessNumber(userId) {
    const target = Math.floor(Math.random() * 100) + 1;
    activeGames.set(userId, { type: 'guess_number', target, attempts: 0 });
    return "لقد بدأت لعبة تخمين الرقم! حاول تخمين رقم بين 1 و 100.";
}

export function handleGameTurn(userId, input) {
    const game = activeGames.get(userId);
    if (!game) return null;

    if (game.type === 'guess_number') {
        const guess = parseInt(input);
        if (isNaN(guess)) return "الرجاء إدخال رقم صحيح.";

        game.attempts++;
        if (guess === game.target) {
            activeGames.delete(userId);
            return `مبروك! لقد خمنت الرقم الصحيح ${game.target} في ${game.attempts} محاولات! 🎉`;
        } else if (guess < game.target) {
            return "الرقم أكبر من ذلك! حاول مرة أخرى.";
        } else {
            return "الرقم أصغر من ذلك! حاول مرة أخرى.";
        }
    }

    return null;
}

export const triviaQuestions = [
    { q: "ما هي عاصمة السودان؟", a: "الخرطوم" },
    { q: "ما هو أسرع حيوان بري في العالم؟", a: "الفهد" },
    { q: "من هو مكتشف الجاذبية؟", a: "نيوتن" },
    { q: "كم عدد قارات العالم؟", a: "7" }
];

export function startTrivia(userId) {
    const question = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
    activeGames.set(userId, { type: 'trivia', answer: question.a });
    return `سؤال: ${question.q}\n(أجب بالرسالة التالية)`;
}

export function checkTrivia(userId, input) {
    const game = activeGames.get(userId);
    if (!game || game.type !== 'trivia') return null;

    const isCorrect = input.trim().toLowerCase() === game.answer.toLowerCase();
    activeGames.delete(userId);

    if (isCorrect) {
        return "إجابة صحيحة! أحسنت! 🌟";
    } else {
        return `للأسف إجابة خاطئة. الإجابة الصحيحة هي: ${game.answer}`;
    }
}

export const trueFalseQuestions = [
    { q: "الأخطبوط له 3 قلوب؟", a: "true" },
    { q: "الشمس كوكب؟", a: "false" },
    { q: "الحوت الأزرق هو أكبر حيوان في العالم؟", a: "true" }
];

export function startTrueFalse(userId) {
    const question = trueFalseQuestions[Math.floor(Math.random() * trueFalseQuestions.length)];
    activeGames.set(userId, { type: 'true_false', answer: question.a });
    return `صح أم خطأ؟\n${question.q}`;
}

const words = ["سودان", "تكنولوجيا", "برمجة", "واتساب", "روبوت"];
export function startGuessWord(userId) {
    const word = words[Math.floor(Math.random() * words.length)];
    const scrambled = word.split('').sort(() => Math.random() - 0.5).join('');
    activeGames.set(userId, { type: 'guess_word', answer: word });
    return `خمن الكلمة المبعثرة: ${scrambled}`;
}

export function checkGeneralGame(userId, input) {
    const game = activeGames.get(userId);
    if (!game) return null;

    if (game.type === 'true_false') {
        const userInput = input.trim().toLowerCase();
        const correct = (userInput === 'صح' || userInput === 'true') && game.answer === 'true' ||
            (userInput === 'خطأ' || userInput === 'false') && game.answer === 'false';
        if (userInput === 'صح' || userInput === 'true' || userInput === 'خطأ' || userInput === 'false') {
            activeGames.delete(userId);
            return correct ? "أحسنت! إجابة صحيحة ✅" : `خطأ! الإجابة الصحيحة هي: ${game.answer === 'true' ? 'صح' : 'خطأ'}`;
        }
    }

    if (game.type === 'guess_word') {
        if (input.trim() === game.answer) {
            activeGames.delete(userId);
            return "مبروك! عرفت الكلمة الصحيحة 🎊";
        }
    }

    return null;
}
