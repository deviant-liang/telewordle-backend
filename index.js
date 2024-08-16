const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${port}`);
});

// MongoDB connection and setup
const { MongoClient } = require('mongodb');
const url = 'mongodb://127.0.0.1:27017'
const client = new MongoClient(url);
client.connect();
const db = client.db('wordle');
const collection = db.collection('players');

const words = require('./utils/dictionary');
const { findAndUpdateUser, handleExistingUser, createNewUser, getLeaderboard } = require('./utils/user');
const { getNewWord, generateGuessResponse, getOrResetCurrentWord } = require('./utils/word');
  
app.post('/newOrGetUser', async (req, res) => {
    const { referrerId, userId, name } = req.body;

    if (!userId || !name) {
        return res.status(400).json({ message: 'UserId and name are required' });
    }

    try {
        const db = client.db('wordle');
        const collection = db.collection('players');

        // 生成新單詞
        const newWord = getNewWord();

        // 查詢用戶並更新
        let user = await findAndUpdateUser(collection, userId, newWord);
        let userData = user ? await handleExistingUser(collection, user) : await createNewUser(collection, userId, name, referrerId);

        const leaderboard = await getLeaderboard(collection, userId);

        return res.json({ user: userData, leaderboard });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/guess', async (req, res) => {
    const { userId, guess } = req.body;

    if (!guess) {
        return res.status(400).json({ message: 'Guess is required' });
    }

    try {
        let user = await collection.findOne({ TelegramID: userId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 確保猜測的單字在清單
        if (!words.includes(guess)) {
            return res.status(400).json({ message: 'Invalid guess, word not in the list' });
        }

        // 取得當前單字
        const currentWord = await getOrResetCurrentWord(user, collection, userId);

        // 取得猜測結果
        const response = generateGuessResponse(currentWord, guess);
        const correct = currentWord === guess;

        // 更新資料庫
        await collection.updateOne(
            { TelegramID: userId },
            { $push: { CurrentGuesses: guess } }
        );

        user.CurrentGuesses.push(guess);

        // 檢查是否猜到六次
        if (correct || user.CurrentGuesses.length >= 6) {
            await collection.updateOne(
                { TelegramID: userId },
                { $set: { CurrentWord: getNewWord(), CurrentGuesses: [] } }
            );
        }

        res.json({ result: response, guess, correct });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// the word for testing
// app.get('/word', (req, res) => {
//     const word = "apple";
//     console.log('Received request for /word');
//     res.json({ word: word });
// });