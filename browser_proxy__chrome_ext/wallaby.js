module.exports = function (wallaby) {
  return {
    files: [
      'content.js',
      'manifest.json'
    ],
    tests: [
      'tests/**/*.test.js'
    ],
    testFramework: 'qunit',
    env: {
      kind: 'chrome'
    }
  };
};
