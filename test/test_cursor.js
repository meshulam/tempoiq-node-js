"use strict";

var assert = require("assert");
var Cursor = require("../lib/models/cursor.js");
var Device = require("../lib/models/device.js");

describe("Cursor", function() {

  it("Handles malformed JSON in response", function(done) {
    var cursor = new Cursor(Device, null, "/v2/devices");
    var body = '{"key1": "val1", "truncated';

    cursor.on('data', function(d) {
      assert(false);
    });

    cursor.on("error", function(e) {
      done();
    });

    cursor._handleRequest({
        body: body,
        code: 200
    });
  });
});

