const express = require('express');
const bodyParser = require('body-parser');
const api = require('./src/api');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.json({ hello: 'world'});
});

app.use('/api', api);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`server listening on port ${PORT}`);
});

