const db = require('./db');

module.exports = (req, res) => {
  db.collection('products').get().then(querySnapshot => {
    const data = [];
    querySnapshot.forEach(doc => {
      data.push(doc.data());
    });

    res.render('pages/homepage', { products: data });
  }).catch(e => {
    res.status(500).json({ message: 'Something went wrong ', error: e });
  })
}
