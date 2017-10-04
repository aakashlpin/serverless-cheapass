const express = require('express');
const router = express.Router();

const request = require('request');
const admin = require('firebase-admin');

const serviceAccount = require('./fs-auth.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();


/**
 * POST /crawl_all triggers a lambda function for each item in 'products'
 */
router.post('/crawl_all', (req, res) => {
  db.collection('products').get().then((querySnapshot) => {
    const data = [];
    querySnapshot.forEach(doc => {
      request({
        url: `${process.env.LAMBDA_ENDPOINT}/dev/crawl`,
        method: 'POST',
        form: Object.assign({}, {
          id: doc.id,
        }, doc.data())
      });
    });

    res.json({ message: 'Crawling all products' });
  }).catch(e => {
    res.status(500).json({ message: 'Something went wrong ', error: e });
  })
})

/**
 * POST /products to add to GFS collection
 */
router.post('/products', (req, res) => {
  /**
   * make a call to lambda rest endpoint
   * grab the title, price and image
   * then add with all the details
   */
  const { url } = req.body;

  request({
    url: `${process.env.LAMBDA_ENDPOINT}/dev/add`,
    method: 'POST',
    form: {
      url,
    }
  }, (error, response, body) => {
    if (error) {
      return res.status(500).json({ message: 'Something went wrong', error });
    }

    const scrapedInfo = JSON.parse(body);

    /**
     * TODO lets assign doc ids as normalized product url
     * this is required for updating the price later
     */

    db.collection('products').add(
      Object.assign({}, {
        url,
        created: new Date(),
      }, scrapedInfo)
    ).then(docRef => {
      res.json({ message: 'Successfully added url', ackId: docRef.id });
    }).catch(e => {
      res.status(500).json({ message: 'Something went wrong', error: e });
    });
  });
});


/**
 * GET /products - retreives all products in GFS
 */
router.get('/products', (req, res) => {
  db.collection('products').get().then((querySnapshot) => {
    const data = [];
    // unable to `.map` on `querySnapshot`
    querySnapshot.forEach(doc => data.push(Object.assign({}, {
      id: doc.id
    }, doc.data())));

    res.json(data);
  }).catch(e => {
    res.status(500).json({ message: 'Something went wrong ', error: e });
  })
});


/**
 * POST /prices/:id
 * determines whether or not to send a pda
 */
router.post('/prices/:id', (req, res) => {
  // add price data
  const { productInfo, scrapedInfo } = req.body;
  const storedPrice = Number(productInfo.price);
  const scrapedPrice = Number(scrapedInfo.price);

  if (storedPrice !== scrapedPrice) {
    /**
     * TODO will need to update the 'products' collection
     */
    db.collection('prices').add({
      pid: productInfo.id,
      price: scrapedPrice,
      created: new Date(),
    }).then(docRef => {
      res.json({ message: 'Successfully added to prices collection', ackId: docRef.id })
    }).catch(e => {
      res.status(500).json({ message: 'Something went wrong!', error: e });
    });
  } else {
    res.json({ message: 'Done, but nothing has really changed!' });
  }
});

module.exports = router;
