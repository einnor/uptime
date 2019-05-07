var crypto = require('crypto');
var querystring = require('querystring');
var https = require('https');
var config = require('./config');

// Container for all the helpers
var helpers = {};

// Create a SHA256 hash
helpers.hash = (str) => {
  if (typeof(str) === 'string' && str.length > 0) {
    var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
};

// Parse a JSON string to an object in all cases without throwing
helpers.parseJsonToObject = (str) => {
  try {
    var obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
};

// Create a string of random alphanumeric characters of a given length
helpers.createRandomString = (strLength) => {
  strLength = typeof(strLength) === 'number' && strLength > 0 ? strLength : false;
  if (strLength) {
    // Define all the possible characters that could go into a string
    var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Start the final string
    var str = '';
    for (let i = 0; i < strLength; i++) {
      // Get random character from the possibleCharacters string
      var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * (possibleCharacters.length - 1)));
      // Append character to the final string
      str += randomCharacter;
    }
    return str;
  } else {
    return false;
  }
};

// Send and SMS message via Twilio
helpers.sendTwiliosSms = (phone, msg, callback) => {
  // Validate parameters
  var phone = typeof(phone) === 'string' && phone.trim().length === 10 ? phone.trim() : false;
  var msg = typeof(msg) === 'string' && msg.trim().length <= 1600 ? msg.trim() : false;
  if (phone && msg) {
    // Configure the request payload
    var payload = {
      From: config.twilio.fromPhone,
      To: phone,
      Body: msg,
    };

    // Stringify the payload
    var stringPayload = querystring.stringify(payload);

    // Configure the request details
    var requestDetails = {
      protocol: 'https',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
      auth: config.twilio.accountSid + ':' + config.twilio.authToken,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': BufferbyteLength(stringPayload),
      },
    };

    // Instantiate the request object
    var req = https.request(requestDetails, (res) => {
      // Grab the status of the sent request
      var status = res.statusCodes

      // Callback successfully if the request went through
      if (status === 200 || status === 201) {
        callback(false);
      } else {
        callback('Status code returned was ' + status);
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', (e) => {
      callback(e);
    });

    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();
  } else {
    callback('Given parameters were missing or invalid');
  }
};

module.exports = helpers;
