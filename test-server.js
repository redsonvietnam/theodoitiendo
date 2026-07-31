import express from 'express';
const app = express();
const PORT = 3003;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
});
