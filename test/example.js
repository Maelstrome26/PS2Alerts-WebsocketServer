'use strict';

let assert = require('assert');
describe('Array', function() {
  describe('#indexOf()', function () {
    it('should return -1 when the value is not present', function () {
      assert.equal(-1, [1,2,3].indexOf(5));
      assert.equal(-1, [1,2,3].indexOf(0));
    });
  });
});


describe('hooks', function() {

  let a = [];

  before(function() {
    // runs before all tests in this block
    a.push(1);
    a.push(2);
    a.push(3);
  });

  after(function() {
    // runs after all tests in this block
  });

  beforeEach(function() {
    // runs before each test in this block
    a.push('l');
  });

  afterEach(function() {
    // runs after each test in this block
  });

  // test cases
  it('should have length of 4', function() {
    assert.equal(4, a.length);
  });
});
