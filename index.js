const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

const { MongoClient } = require('mongodb');
const url = 'mongodb://127.0.0.1:27017'
const client = new MongoClient(url);
client.connect();

const word = "apple";
const words = require('./words');

// the word for testing
app.get('/word', (req, res) => {
    console.log('Received request for /word');
    res.json({ word: word });
});
  

// new user or get user
app.post('/newOrGetUser', async (req, res) => {
    const { referrerId, userId, name } = req.body;

    if (!userId || !name) {
        return res.status(400).json({ message: 'UserId and name are required' });
    }

    try {
        const db = client.db('wordle');
        const collection = db.collection('players');

        let user = await collection.findOne({ TelegramID: userId }, { projection: { CurrentWord: 0 } });

        if (user) {
            return res.json(user);
        } else {
            let validReferrer = null;
            if (referrerId) {
                validReferrer = await collection.findOne({ TelegramID: referrerId });
            }

            const newUser = {
                TelegramID: userId,
                Name: name,
                Rank: 0,
                PlayCount: 0,
                Points: 0,
                Referrer: validReferrer ? referrerId : null,
                ReferralCount: 0,
                Referrals: [],
                CurrentWord: '',
                CurrentGuesses: []
            };

            await collection.insertOne(newUser);

            if (validReferrer) {
                await collection.updateOne(
                    { TelegramID: referrerId },
                    { $inc: { ReferralCount: 1 }, $push: { Referrals: userId } }
                );
            }

            const { CurrentWord, ...returnUser } = newUser;
            return res.json(returnUser);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});


function getNewWord() {
  const index = Math.floor(Math.random() * words.length);
  return words[index];
}

function generateGuessResponse(word, guess) {
    const letterCount = {};
    for (const char of word) {
        if (letterCount[char]) {
            letterCount[char]++;
        } else {
            letterCount[char] = 1;
        }
    }

    const response = [];
    for (let i = 0; i < guess.length; i++) {
        const guessChar = guess[i];
        if (guessChar === word[i]) {
            response.push('o'); // correct
            letterCount[guessChar]--;
        } else {
            response.push('x'); // absent
        }
    }

    // 2nd pass to mark present letters
    for (let i = 0; i < guess.length; i++) {
        const guessChar = guess[i];
        if (response[i] === 'x' && word.includes(guessChar) && letterCount[guessChar] > 0) {
            response[i] = '/'; // present
            letterCount[guessChar]--;
        }
    }

    return response.join('');
}

app.post('/guess', async (req, res) => {
    const { userId, guess } = req.body;

    if (!guess) {
        return res.status(400).json({ message: 'Guess is required' });
    }

    try {
        const db = client.db('wordle');
        const collection = db.collection('players');
        let user = await collection.findOne({ TelegramID: userId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Ensure the guessed word is in the list
        if (!words.includes(guess)) {
            return res.status(400).json({ message: 'Invalid guess, word not in the list' });
        }

        // If there is no current word or it's the first attempt, generate a new word
        if (!user.CurrentWord || user.CurrentWord.length === 0 || user.CurrentGuesses.length === 0) {
            const newWord = getNewWord();
            await collection.updateOne(
                { TelegramID: userId },
                { $set: { CurrentWord: newWord, CurrentGuesses: [] } }
            );
            user.CurrentWord = newWord;
        }

        let response = generateGuessResponse(user.CurrentWord, guess);
        const correct = user.CurrentWord === guess;

        // Update guess history and check the number of attempts
        await collection.updateOne(
            { TelegramID: userId },
            { $push: { CurrentGuesses: guess } }
        );

        user.CurrentGuesses.push(guess);

        // Check if the guess is correct or if max attempts are reached
        if (correct) {
            response = 'ooooo';
            const newWord = getNewWord();
            await collection.updateOne(
                { TelegramID: userId },
                { $set: { CurrentWord: newWord, CurrentGuesses: [] } }
            );
        } else if (user.CurrentGuesses.length > 5) {
            // Game over, reset with a new word
            const newWord = getNewWord();
            await collection.updateOne(
                { TelegramID: userId },
                { $set: { CurrentWord: newWord, CurrentGuesses: [] } }
            );
            return res.json({ result: 'Game over. Max attempts reached.', newWordSet: true });
        }

        res.json({ result: response, guess, correct });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${port}`);
});