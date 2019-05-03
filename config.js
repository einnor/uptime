// Container for all environments
var environments = {};

// Staging (default) environment
environments.staging = {
  httpPort: 4000,
  httpsPorts: 4001,
  envName: 'staging',
};

// Production environment
environments.production = {
  httpPorts: 5000,
  httpsPorts: 5001,
  envName: 'production',
};

// Determine which environment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check if the current environment is one of the environments above, else default to staging
var environmentToExport = typeof(environments[currentEnvironment]) === 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;
