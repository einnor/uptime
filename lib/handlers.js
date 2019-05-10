var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');

// Define the request handlers
var handlers = {};

/**
 * HTML Handlers
 * 
 */

 // Index handler
 handlers.index = (data, callback) => {
   // Reject any request that isn't a GET
   if (data.method === 'get') {
     // Read in a template as a string
     helpers.getTemplate('index', (err, str) => {
       if (!err && str) {
         callback(200, str, 'html');
       } else {
         callback(500, undefined, 'html');
       }
     });
   } else {
     callback(405, undefined, 'html');
   }
 };

/**
 * JSON API Handlers
 * 
 */

 // Ping handler
handlers.ping = (data, callback) => {
	callback(200, { message: 'It lives!' });
};

// Users handler
handlers.users = (data, callback) => {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback)
  } else {
    callback(405);
  }
};

// Container for the users sub-methods
handlers._users = {};

// Users - post
// Required data: { firstName, lastName, phone, password, tosAgreement }
// Optional data: {}
handlers._users.post = (data, callback) => {
  // Check that all required fields are filled out.
  var firstName = typeof(data.payload.firstName)=== 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  var tosAgreement = typeof(data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement === true ? true : false;

  if (firstName, lastName, phone, password, tosAgreement) {
    // Make sure that the user doesn't already exist
    _data.read('users', phone, (err, data) => {
      if (err) {
        // Hash the password
        var hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          // Create the user object
          var userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement: true,
          };

          // Store the user
          _data.create('users', phone, userObject, (err) => {
            if (!err) {
              callback(200);
            } else {
              callback(500, { Error: 'Could not create the new user' });
            }
          });
        } else {
          callback(500, { Error: 'Could not hash the user\'s password' });
        }
      } else {
        callback(400, { Error: 'A user with that phone number already exists' });
      }
    })
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
}

// Users - get
// Required data: phone
// Optional data: phone
handlers._users.get = (data, callback) => {
  // Check that the phone number provided is valid
  var phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
  if (phone) {
    // Only let an authenticated user access their object. Don't let them access anyone else's
    // Get the token from the header
    var token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

    // Verify if the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        // Look up the user
        _data.read('users', phone, (err, data) => {
          if (!err && data) {
            // Remove the hashed password from the user object before returning it to the requester
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        })
      } else {
        callback(403, { Error: 'Missing required token in header or token is invalid' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required phone query parameter' });
  }
}

// Users - put
// Required data: { phone }
// Optional data: { firstName, lastName, password } (at least one must be specified)
handlers._users.put = (data, callback) => {
  // Check for the required field
  var phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;

  // Check for the optional fields
  var firstName = typeof(data.payload.firstName)=== 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  
  // Error if phone is invalid
  if (phone) {
    // Only let an authenticated user access their object. Don't let them access anyone else's
    // Get the token from the header
    var token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

    // Error if nothing is sent to update
    if (firstName || lastName || password) {
      // Verify if the given token is valid for the phone number
      handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
          // Look up the user
          _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
              // Update the fields that are necessary in the userData object
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }

              // Store the new updates
              _data.update('users', phone, userData, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { Error: 'Could not update the user' });
                }
              });
            } else {
              callback(400, { Error: 'The specified user does not exists' });
            }
          });
        } else {
          callback(403, { Error: 'Missing required token in header or token is invalid' });
        }
      });
    } else {
      callback(400, { Error: 'Missing fields to update' });
    }
  } else {
    callback(400, { Error: 'Missing required field phone' });
  }
}

// Users - delete
// Required field: phone
handlers._users.delete = (data, callback) => {
  // Check that the phone number is valid
  var phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
  if (phone) {
    // Only let an authenticated user access their object. Don't let them access anyone else's
    // Get the token from the header
    var token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

    // Verify if the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        // Look up the user
        _data.read('users', phone, (err, userData) => {
          if (!err && userData) {
            _data.delete('users', phone, (err) => {
              if (!err) {
                // Delete each of the checks associated with the specified user
                var userChecks  = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
                var checksToDelete = userChecks.length;
                if (checksToDelete > 0) {
                  var checksDeleted = 0;
                  var deletionErrors = false;

                  // Loop through the checks
                  userChecks.forEach((checkId) => {
                    // Delete the check
                    _data.delete('checks', checkId, (err) => {
                      if (err) {
                        deletionErrors = true;
                      }
                      checksDeleted += 1;
                    });
                  });
                  if (deletionErrors) {
                    callback(500, { Errors: 'Encoutered error(s) while attempting to delete the checks created by the user. Deleted: ' + checksDeleted + ', Remaining: ' + checksToDelete - checksDeleted });
                  } else {
                    callback(200);
                  }
                } else {
                  callback(200);
                }
              } else {
                callback(500, { Error: 'Could not delete the specified user' });
              }
            });
          } else {
            callback(400, { Error: 'Could not find the specified user' });
          }
        });
      } else {
        callback(403, { Error: 'Missing required token in header or token is invalid' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required phone query parameter' });
  }
}

// Tokens Handler
handlers.tokens = (data, callback) => {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback)
  } else {
    callback(405);
  }
};

// Container for all the tokens methods
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
  var phone = typeof(data.payload.phone)=== 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  if (phone && password) {
    // Lookup the user who matches that phone number
    _data.read('users', phone, (err, userData) => {
      if (!err && userData) {
        // Hash the sent sent password and compare it to the password stored in the user object
        var hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.hashedPassword) {
          // Create a new token with a random name. Set expiration date 1 hour in the future
          var tokenId = helpers.createRandomString(20);
          var expires = Date.now() + 1000 * 60 * 60;
          var tokenObject = {
            phone,
            id: tokenId,
            expires,
          };

          // Store the token
          _data.create('tokens', tokenId, tokenObject, (err) => {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { Error: 'Could not create the new token' });
            }
          });
        } else {
          callback(400, { Error: 'Passwords did not match the specified user\'s stored password'})
        }
      } else {
        callback(400, { Error: 'Could not find the specified user' });
      }
    })
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
  // Check that the id provided is valid
  var id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Look up the token
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && data) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    })
  } else {
    callback(400, { Error: 'Missing required id query parameter' });
  }
};

// Tokens - put
// Required fields: { id, extend }
// Optional fields: none
handlers._tokens.put = (data, callback) => {
  var id = typeof(data.payload.id)=== 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
  var extend = typeof(data.payload.extend)=== 'boolean' && data.payload.extend === true ? true : false;
  if (id && extend) {
    // Look up the token
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        // Check to make sure the token isn't already active
        if (tokenData.expires > Date.now()) {
          // Set the expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          // Store the new updates
          _data.update('tokens', id, tokenData, (err) => {
            if (!err) {
              callback(200);
            } else {
              callback(500, { Error: 'Could not update the token\'s expiration' });
            }
          });
        } else {
          callback(400, { Error: 'The token has already expired and cannot be extended' });
        }
      } else {
        callback(400, { Error: 'Specified token does not exists' });
      }
    })
  } else {
    callback(400, { Error: 'Missing required field(s) of field(s) are invalid' });
  }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
  // Check that the id is valid
  var id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Look up the token
    _data.read('tokens', id, (err, data) => {
      if (!err && data) {
        _data.delete('tokens', id, (err) => {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: 'Could not delete the specified token' });
          }
        });
      } else {
        callback(400, { Error: 'Could not find the specified token' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required id query parameter' });
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, phone, callback) => {
  // Look up the token
  _data.read('tokens', id, (err, tokenData) => {
    if (!err && tokenData) {
      // Check that the token is for the given user and has not expired
      if (tokenData.phone === phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// Checks handler
handlers.checks = (data, callback) => {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback)
  } else {
    callback(405);
  }
};

// Container for all the checks methods
handlers._checks = {};

// Checks - post
//Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = (data, callback) => {
  // Validate inputs
  var protocol = typeof(data.payload.protocol) === 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  var url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Get the token from the header
    var token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

    // Lookup the user by reading the token
    _data.read('tokens', token, (err, tokenData) => {
      if (!err && tokenData) {
        var userPhone = tokenData.phone;

        // Lookup the user data
        _data.read('users', userPhone, (err, userData) => {
          if (!err && userData) {
            var userChecks  = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];

            // Verify that the user has less than the number of maxChecks per user
            if (userChecks.length < config.maxChecks) {
              // Create a random id for the check
              var checkId = helpers.createRandomString(20);

              // Create the check object and includes the user's phone
              var checkObject = {
                id: checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds,
              };

              // Save the object
              _data.create('checks', checkId, checkObject, (err) => {
                if (!err) {
                  // Add the checkId to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Save the new user data
                  _data.update('users', userPhone, userData, (err) => {
                    if (!err) {
                      // Return the data about the new check
                      callback(200, checkObject);
                    } else {
                      callback(500, { Error: 'Could not update the user with the new check' });
                    }
                  });
                } else {
                  callback(500, { Error: 'Could not create the new check' });
                }
              });
            } else {
              callback(400, { Error: 'Maximum number of checks reached: ' + config.maxChecks });
            }
          } else {
            callback(403);
          }
        });
      } else {
        callback(403);
      }
    });
    
  } else {
    callback(400, { Error: 'Missing required fields or fields are invalid' });
  }
};

// Checks - get
//Required data: id
// Optional data: none
handlers._checks.get = (data, callback) => {
  // Check that the id provided is valid
  var id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Look up the check
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        // Only let an authenticated user access their object. Don't let them access anyone else's
        // Get the token from the header
        var token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

        // Verify if the given token is valid for the user who created the check
        handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
          if (tokenIsValid) {
            // Retun the check data
            callback(200, checkData);
          } else {
            callback(403, { Error: 'Missing required token in header or token is invalid' });
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: 'Missing required id query parameter' });
  }
};

// Checks - put
//Required data: { id }
// Optional data: { protocol, url, method, successCodes, timeoutSeconds }
handlers._checks.put = (data, callback) => {
  var id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
  var protocol = typeof(data.payload.protocol) === 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  var url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  if (id) {
    // Look up the check
    // Error if nothing is sent to update
    if (protocol || url || method || successCodes || timeoutSeconds) {
      _data.read('checks', id, (err, checkData) => {
        if (!err && checkData) {
          // Only let an authenticated user access their object. Don't let them access anyone else's
          // Get the token from the header
          var token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

          // Verify if the given token is valid for the user who created the check
          handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
            if (tokenIsValid) {
              // Update the fields that are necessary in the checkData object
              if (protocol) {
                checkData.protocol = protocol;
              }
              if (url) {
                checkData.url = url;
              }
              if (method) {
                checkData.method = method;
              }
              if (successCodes) {
                checkData.successCodes = successCodes;
              }
              if (timeoutSeconds) {
                checkData.timeoutSeconds = timeoutSeconds;
              }

              // Store the new updates
              _data.update('checks', id, checkData, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { Error: 'Could not update the check' });
                }
              });
            } else {
              callback(403, { Error: 'Missing required token in header or token is invalid' });
            }
          });
        } else {
          callback(404);
        }
      });
    } else {
      callback(400, { Error: 'Missing fields to update' });
    }
  } else {
    callback(400, { Error: 'Missing required field id' });
  }
};

// Checks - delete
//Required data: id
// Optional data: none
handlers._checks.delete = (data, callback) => {
  // Check that the id is valid
  var id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (id) {
    // Lookup the check
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        // Only let an authenticated user access their object. Don't let them access anyone else's
        // Get the token from the header
        var token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

        // Verify if the given token is valid for the phone number
        handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
          if (tokenIsValid) {
            // Look up the user
            _data.read('users', checkData.userPhone, (err, userData) => {
              if (!err && userData) {
                var userChecks  = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];

                // Remove the delete check from the list of checks
                var checkPosition = userChecks.indexOf(id);
                if (checkPosition > -1) {
                  userChecks.splice(checkPosition, 1);

                  // Re-save the user's data
                  userData.checks = userChecks;
                  _data.update('users', checkData.userPhone, userData, (err) => {
                    if (!err) {
                      _data.delete('checks', id, (err) => {
                        if (!err) {
                          callback(200);
                        } else {
                          callback(500, { Error: 'Could not update the user' });
                        }
                      });
                    } else {
                      callback(500, { Error: 'Could not update the user checks list' });
                    }
                  });
                } else {
                  callback(500, { Error: 'Could not find the check on the user object, hence could not remove it' });
                }
              } else {
                callback(400, { Error: 'Could not find the user who created the check, hence could not remove the check from the user checks' });
              }
            });
          } else {
            callback(403, { Error: 'Missing required token in header or token is invalid' });
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: 'Missing required phone query parameter' });
  }
};


// Not found handler
handlers.notFound = (data, callback) => {
	callback(404);
};

module.exports = handlers;
