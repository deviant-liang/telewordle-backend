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
const { createNewUser, findUser, getLeaderboard } = require('./utils/user');
const { getNewWord, generateGuessResponse } = require('./utils/word');

app.post('/newWord', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'UserId is required' });
    }

    try {
        // 生成新單字並更新資料庫
        const newWord = getNewWord();
        const result = await collection.updateOne(
            { TelegramID: userId },
            { $set: { CurrentWord: newWord, CurrentGuesses: [] } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 回傳成功訊息
        return res.json({ message: 'Word has been reset successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/newOrGetUser', async (req, res) => {
    const { referrerId, userId, name } = req.body;

    if (!userId || !name) {
        return res.status(400).json({ message: 'UserId and name are required' });
    }

    try {        
        // 取得 user
        let user = await findUser(collection, userId);
        let userData = user ? user : await createNewUser(collection, userId, name, referrerId);

        const newWord = getNewWord();
        await collection.updateOne(
            { TelegramID: userId },
            { $set: { CurrentWord: newWord, CurrentGuesses: [] } }
        );

        // 取得 friends
        let friends = [];
        if (user && user.Referrals && user.Referrals.length > 0) {
            friends = await collection.find(
                { TelegramID: { $in: user.Referrals } },
                { projection: { Name: 1, Points: 1 } }
            ).toArray();
        }

        // 取得 leaderboard
        const leaderboard = await getLeaderboard(collection, userId);

        return res.json({ user: userData, friends, leaderboard });

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

        // 對照單字列表
        if (!words.includes(guess)) {
            return res.status(400).json({ message: 'Invalid guess, word not in the list' });
        }

        // 取得當前單字
        const currentWord = user.CurrentWord;

        // 取得猜測結果
        const response = generateGuessResponse(currentWord, guess);
        const correct = currentWord === guess;

        // 更新資料庫
        await collection.updateOne(
            { TelegramID: userId },
            { $push: { CurrentGuesses: guess } }
        );

        user.CurrentGuesses.push(guess);

        // 猜對時增加積分
        let pointsEarned = 0;
        if (correct) {
            pointsEarned = Math.max(25 - user.CurrentGuesses.length * 3, 1); // 根據猜測次數給分
            await collection.updateOne(
                { TelegramID: userId },
                { $inc: { Points: pointsEarned } }
            );
        }

        let responseData = { result: response, guess, correct, pointsEarned };

        // 正確或猜六次都沒對
        if (correct || user.CurrentGuesses.length >= 6) {
            responseData.correctWord = currentWord; // 回傳正確單字
            await collection.updateOne(
                { TelegramID: userId },
                { $set: { CurrentWord: getNewWord(), CurrentGuesses: [] } }
            );
        }

        res.json(responseData);
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