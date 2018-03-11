const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const api = require('./src/api');
const homepage = require('./src/homepage');

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

app.get('/', homepage);

app.use('/api', api);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`server listening on port ${PORT}`);
});

