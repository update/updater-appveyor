'use strict';

module.exports = {
  environment: {
    matrix: [
      { nodejs_version: "6.0" },
      { nodejs_version: "4.0" },
      { nodejs_version: "0.12" },
      { nodejs_version: "0.10" }
    ]
  },
  install: [
    {ps: 'Install-Product node $env:nodejs_version'},
    'npm install'
  ],
  test_script: [
    'node --version',
    'npm --version',
    'npm test'
  ],
  build: 'off'
};
