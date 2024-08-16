// 設置新單字
function getNewWord() {
    const index = Math.floor(Math.random() * words.length);
    return words[index];
}

// 計算字母出現次數
function countLetters(word) {
    const letterCount = {};
    for (const char of word) {
        letterCount[char] = (letterCount[char] || 0) + 1;
    }
    return letterCount;
}

// 猜測結果
function generateGuessResponse(word, guess) {
    const letterCount = countLetters(word);
    const response = new Array(guess.length).fill('x'); // 一開始標記為錯誤

    // 第一次迴圈取得正確位置的字母
    for (let i = 0; i < guess.length; i++) {
        if (guess[i] === word[i]) {
            response[i] = 'o';
            letterCount[guess[i]]--;
        }
    }

    // 第二次迴圈取得錯誤位置的字母
    for (let i = 0; i < guess.length; i++) {
        if (response[i] === 'x' && letterCount[guess[i]] > 0) {
            response[i] = '/';
            letterCount[guess[i]]--;
        }
    }

    return response.join('');
}

module.exports = { getNewWord, generateGuessResponse };