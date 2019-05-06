var crypto = require('crypto');
var config = require('./config');

// Container for all the helpers
var helpers = {};

// Create a SHA256 hash
helpers.hash = (str) => {
  if (typeof(str) === 'string' && str.length > 0) {
    var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digetst('hex');
    return hash;
  } else {
    return false;
  }
};

module.exports = helpers;
