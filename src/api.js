const md5 = require('md5');
const express = require('express');
const router = express.Router();

const request = require('request');
const email = require('./email');
const db = require('./db');

const hash = url => md5(url);

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
        json: Object.assign({}, {
          id: doc.id,
        }, doc.data()),
        headers: {
          "Content-type": "application/json",
        },
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
    },
  }, (error, response, body) => {
    if (error) {
      return res.status(500).json({ message: 'Something went wrong', error });
    }

    console.log({ body });
    const scrapedInfo = JSON.parse(body);
    console.log({ scrapedInfo });
    if (!scrapedInfo.url) {
      return res.status(500).json({ message: 'something went wrong with scraping the url; attached the data from scraping server', scrapedInfo });
    }

    db.collection('products').doc(hash(scrapedInfo.url)).set(Object.assign({}, {
      created: new Date(),
    }, scrapedInfo)).then(docRef => {
      res.json({ message: 'Successfully added url', ackId: docRef.id });
    }).catch(e => {
      res.status(500).json({ message: 'Something went wrong', error: e });
    });
  });
});


/**
 * POST /prices/:id
 * determines whether or not to send a pda
 */
router.post('/prices/:id', (req, res) => {
  // add price data
  const { productInfo, scrapedInfo } = req.body;
  console.log({ productInfo, scrapedInfo });
  if (!scrapedInfo) {
    // something went wrong with scraping. lets try again
    request({
      url: `${process.env.LAMBDA_ENDPOINT}/dev/crawl`,
      method: 'POST',
      json: productInfo,
      headers: {
        "Content-type": "application/json",
      },
    });

    return;
  }

  const storedPrice = productInfo.price;
  const scrapedPrice = scrapedInfo.price;

  if (storedPrice !== scrapedPrice) {
    db.collection('products').doc(hash(productInfo.url)).update(
      Object.assign({}, productInfo, scrapedInfo)
    );

    db.collection('prices').add({
      pid: productInfo.id,
      price: scrapedPrice,
      created: new Date(),
    }).then(docRef => {
      res.json({ message: 'Successfully added to prices collection', ackId: docRef.id })
    }).catch(e => {
      res.status(500).json({ message: 'Something went wrong!', error: e });
    });

    if (scrapedPrice < storedPrice) {
      email(Object.assign({}, productInfo, {
        storedPrice,
        scrapedPrice
      }))
    }
  } else {
    res.json({ message: 'Done, but nothing has really changed!' });
  }
});

module.exports = router;
