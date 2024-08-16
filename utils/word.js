function getNewWord() {
    const index = Math.floor(Math.random() * words.length);
    return words[index];
}

// 辅助函数：计算一个单词中每个字符的出现次数
function countLetters(word) {
    const letterCount = {};
    for (const char of word) {
        letterCount[char] = (letterCount[char] || 0) + 1;
    }
    return letterCount;
}

// 辅助函数：生成猜测结果
function generateGuessResponse(word, guess) {
    const letterCount = countLetters(word);
    const response = new Array(guess.length).fill('x'); // 初始全部标记为错误

    // 第一遍遍历，标记正确位置的字母
    for (let i = 0; i < guess.length; i++) {
        if (guess[i] === word[i]) {
            response[i] = 'o'; // 正确位置
            letterCount[guess[i]]--;
        }
    }

    // 第二遍遍历，标记存在但位置不正确的字母
    for (let i = 0; i < guess.length; i++) {
        if (response[i] === 'x' && letterCount[guess[i]] > 0) {
            response[i] = '/'; // 存在但位置不正确
            letterCount[guess[i]]--;
        }
    }

    return response.join('');
}

// 辅助函数：获取或重置当前单词
async function getOrResetCurrentWord(user, collection, userId) {
    if (!user.CurrentWord || user.CurrentGuesses.length === 0) {
        const newWord = getNewWord();
        await collection.updateOne(
            { TelegramID: userId },
            { $set: { CurrentWord: newWord, CurrentGuesses: [] } }
        );
        return newWord;
    }
    return user.CurrentWord;
}

module.exports = { getNewWord, generateGuessResponse, getOrResetCurrentWord };