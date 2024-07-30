const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

const word = "apple";

// the word for testing
app.get('/word', (req, res) => {
    console.log('Received request for /word');
    res.json({ word: word });
});
  
// check user's guess against the word
app.post('/guess', (req, res) => {
    const { guess } = req.body;
    if (!guess) return res.status(400).json({ message: 'Guess is required' });
  
    const result = word.split('').map((char, index) => {
      if (char === guess[index]) return { letter: char, status: 'correct' };
      if (word.includes(guess[index])) return { letter: guess[index], status: 'present' };
      return { letter: guess[index], status: 'absent' };
    });
  
    const correct = word === guess;
    res.json({ result, correct });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${port}`);
});