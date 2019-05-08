/**
 * Worker-related tasks
 */
var path = require('path');
var fs = require('fs');
var http = require('http');
var https = require('https');
var url = require('url');
var _data = require('./data');
var helpers = require('./helpers');

// Instantiate the workers object
var workers = {};

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = () => {
  // Get all the checks
  _data.list('checks', (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach((check) => {
        // Read in the check data
        _data.read('checks', check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            // Pass the checkData to the check validator, and let that function continue or log errors as needed
            workers.validateCheckData(originalCheckData);
          } else {
            console.log({ Error: 'Error reading one of the check\'s data' });
          }
        });
      });
    } else {
      console.log({ Error: 'Could not find any checks to process '});
    }
  });
};

// Sanity check the check data
workers.validateCheckData = (originalCheckData) => {
  originalCheckData = typeof(originalCheckData) === 'object' && originalCheckData != null ? originalCheckData : {};
  originalCheckData.id = typeof(originalCheckData.id) === 'string' && originalCheckData.id.trim().length === 20 ? originalCheckData.id.trim() : false;
  originalCheckData.userPhone = typeof(originalCheckData.userPhone) === 'string' && originalCheckData.userPhone.trim().length === 10 ? originalCheckData.userPhone.trim() : false;
  originalCheckData.protocol = typeof(originalCheckData.protocol) === 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
  originalCheckData.url = typeof(originalCheckData.url) === 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
  originalCheckData.method = typeof(originalCheckData.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
  originalCheckData.successCodes = typeof(originalCheckData.successCodes) === 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
  originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) === 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

  // Set the keys that may not be set if the workers have never seen this check before
  originalCheckData.state = typeof(originalCheckData.state) === 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
  originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) === 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

  // If all the checks pass, pass the data along to the next step in the process
  if (originalCheckData.id && originalCheckData.userPhone && originalCheckData.protocol && originalCheckData.url && originalCheckData.method && originalCheckData.successCodes && originalCheckData.timeoutSeconds) {
    workers.performCheck(originalCheckData);
  } else {
    console.log({ Error: 'One of the checks is not properly formatted. Skipping it' });
  }
};

// Timer to execute the worker-process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

// Init script
workers.init = () => {
  // Execute all the checks
  workers.gatherAllChecks();

  // Call the loop so the checks will execute later on
  workers.loop();
};

// Export the module
module.exports = workers;
