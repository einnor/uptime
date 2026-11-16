var crypto = require('crypto');
var querystring = require('querystring');
var https = require('https');
var path = require('path');
var fs = require('fs');
var config = require('./config');

// Container for all the helpers
var helpers = {};

// Password records use a per-password salt and a slow KDF.
helpers.hash = (str) => {
  if (typeof(str) === 'string' && str.length > 0) {
    var salt = crypto.randomBytes(16).toString('hex');
    return 'scrypt:' + salt + ':' + crypto.scryptSync(str, salt, 64).toString('hex');
  } else {
    return false;
  }
};

helpers.verifyPassword = (password, stored) => {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  var [algorithm, salt, hash] = stored.split(':');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hash)) return false;
  return crypto.timingSafeEqual(crypto.scryptSync(password, salt, 64), Buffer.from(hash, 'hex'));
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
  strLength = Number.isInteger(strLength) && strLength > 0 && strLength <= 1024 ? strLength : false;
  if (strLength) {
    // Define all the possible characters that could go into a string
    var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Start the final string
    var str = '';
    for (let i = 0; i < strLength; i++) {
      // Get random character from the possibleCharacters string
      var randomCharacter = possibleCharacters.charAt(crypto.randomInt(possibleCharacters.length));
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
  if (!config.twilio.accountSid || !config.twilio.authToken || !config.twilio.fromPhone) {
    callback('SMS is disabled: configure Twilio credentials to enable delivery');
    return;
  }
  // Validate parameters
  var phone = typeof(phone) === 'string' && phone.trim().length === 10 ? phone.trim() : false;
  var msg = typeof(msg) === 'string' && msg.trim().length <= 1600 ? msg.trim() : false;
  if (phone && msg) {
    // Configure the request payload
    var payload = {
      From: config.twilio.fromPhone,
      To: '+1' + phone,
      Body: msg,
    };

    // Stringify the payload
    var stringPayload = querystring.stringify(payload);

    // Configure the request details
    var requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
      auth: config.twilio.accountSid + ':' + config.twilio.authToken,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload),
      },
    };

    // Instantiate the request object
    var req = https.request(requestDetails, (res) => {
      // Grab the status of the sent request
      var status = res.statusCode;

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

// Get the string content of a template
helpers.getTemplate = (templateName, callback) => {
  // Sanity check the template name
  templateName = typeof(templateName) === 'string' && templateName.length > 0 ? templateName : false;
  if (templateName) {
    var templatesDir = path.join(__dirname, '/../templates/');
    fs.readFile(templatesDir + templateName + '.html', 'utf8', (err, str) => {
      if (!err && str && str.length > 0) {
        callback(false, str);
      } else {
        callback('No template could be found');
      }
    });
  } else {
    callback('A valid template name was not specified');
  }
};

module.exports = helpers;
