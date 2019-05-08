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

/
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
