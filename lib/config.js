module.exports = {
  host: process.env.HOST || '127.0.0.1',
  httpPort: Number(process.env.PORT || 4000),
  httpsPort: Number(process.env.HTTPS_PORT || 4001),
  envName: process.env.NODE_ENV || 'development',
  maxChecks: 5,
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromPhone: process.env.TWILIO_FROM_PHONE || '',
  },
};
