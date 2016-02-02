'use strict';

let assert = require('assert');
let CombatParser = require('../lib/combat_parser.js');

describe('CombatParser', function() {
  
  let cp = new CombatParser();

  before(function() {
    // runs before all tests in this block
  });

  after(function() {
    // runs after all tests in this block
  });

  beforeEach(function() {
    // runs before each test in this block
  });

  afterEach(function() {
    // runs after each test in this block
  });

  // test cases
  describe('#onmessage()', function () {
    it('One message should inc counter', function() {
      cp.number_messages = 0;
      cp.onmessage("Test 1.2.3..");
    
      assert.equal(1, cp.number_messages);
    });
  });
});
