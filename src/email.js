const emailTemplates = require('email-templates');
const path = require('path');
const mailgun = require('./mailgun');
const templatesDir = path.resolve(__dirname, 'templates');

module.exports = (product, callback = () => {}) => {
  emailTemplates(templatesDir, (err, template) => {
    if (err) {
      callback(err);
    } else {
      const locals = {
        product,
      };

      // Send a single email
      template('pricedrop', locals, (err, html) => {
        if (err) {
          callback(err);
        } else {
          mailgun({
            subject: `Price dropppped! - ${locals.product.name}`,
            html,
            to: 'aakashlpin+cheapass@gmail.com',
          }, callback);
        }
      });
    }
  });
}
