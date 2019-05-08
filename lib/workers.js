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
