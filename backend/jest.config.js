module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
  ],
  testMatch: [
    '**/tests/**/*.test.js',
  ],
  testTimeout: 30000,
  verbose: true,
  setupFiles: ['<rootDir>/tests/setup.js'],
};
