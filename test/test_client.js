'use strict';

var assert = require("assert");
var tempoiq = require("../lib/tempoiq");

var StubbedSession = require("../lib/session/stubbed_session");

var _getClient = function() {
  if (process.env.INTEGRATION) {
    var creds = require('./integration-credentials.json')
    return tempoiq.Client(creds.key, creds.secret, creds.hostname, {port: creds.port, secure: creds.secure});
  } else {
    return tempoiq.Client("stubbed_key", "stubbed_secret", "stubbed_host", {secure: false, session: new StubbedSession})
  }
}

var _createDevice = function(callback) {
  var client = _getClient();
  var stubbed_body = {
    key: "device1",
    name: "My Awesome Device",
    attributes: {building: "1234"},
    sensors: []
  };
  client._session.stub("POST", "/v2/devices", 200, JSON.stringify(stubbed_body), {});
  client.createDevice(new tempoiq.Device("device"), function(err, device) {
    if (err) throw err;
    callback(device);
  });
};

var _deleteDevices = function(callback) {
  var client = _getClient();
  var stubbed_body = {
    deleted: 1
  };
  client._session.stub("DELETE", "/v2/devices", 200, JSON.stringify(stubbed_body), {});
  client.deleteDevices({devices: "all"}, function(err, summary) {
    if (err) throw err;
    callback(summary);
  });
};

describe("Client", function() {
  describe("Initialization", function() {
    it("creates the client with the correct construction parameters", function() {
      var client = tempoiq.Client("key", "secret", "host", {
	port: 80
      });
      assert.equal("key", client.key);
      assert.equal("secret", client.secret);
      assert.equal("host", client.host);
      assert.equal(80, client.port);
    });
  })

  describe("Device provisioning", function() {
    beforeEach(function(done) {
      _deleteDevices(function(summary) {
	done();
      });
    });

    afterEach(function(done) {
      _deleteDevices(function(summary) {
	done();
      });
    });

    it("creates a device", function(done) {
      var client = _getClient();
      var stubbedBody = {
	key: "stubbed_key",
	name: "stubbed_name",
	attributes: {attr1: "value1"},
	sensors: []
      };
      client._session.stub("POST", "/v2/devices", 200, JSON.stringify(stubbedBody), {});
      client.createDevice(new tempoiq.Device("stubbed_key", {
	name: "stubbed_name",
	attributes: {attr1: "value1"},
	sensors: []
      }), function(err, device) {
	if (err) throw err;
	assert.equal("stubbed_key", device.key);
	assert.equal("stubbed_name", device.name);
	assert.equal("value1", device.attributes["attr1"]);
	assert.equal(0, device.sensors.length);
	done();
      });
    });

    it("deletes a device", function(done) {
      var client = _getClient();
      _createDevice(function(device) {
	var stubbedBody = {
	  deleted: 1
	};
	client._session.stub("DELETE", "/v2/devices", 200, JSON.stringify(stubbedBody), {});
	client.deleteDevices({devices: {key: device.key}}, function(err, summary) {
	  if (err) throw err;
	  assert.equal(1, summary.deleted);
	  done();
	});
      })
    });

    it("updates a device", function(done) {
      var client = _getClient();
      _createDevice(function(device) {
	var originalName = device.name;
	device.name = "Updated";
	assert.notEqual(originalName, device.name);

	client._session.stub("PUT", "/v2/devices/"+encodeURIComponent(device.key), 200, JSON.stringify(device), {});
	client.updateDevice(device, function(err, updatedDevice) {
	  if (err) throw err;
	  assert.equal(device.name, updatedDevice.name);
	  done();
	});
      });
    });

    it("gets a device", function(done) {
      var client = _getClient();
      _createDevice(function(device) {
	client._session.stub("GET", "/v2/devices/"+encodeURIComponent(device.key), 200, JSON.stringify(device), {});
	client.getDevice(device.key, function(err, found) {
	  if (err) throw err;
	  assert.equal(device.key, found.key);
	  done();
	});
      })
    });

    it("returns no device when not found", function(done) {
      var client = _getClient();
      client._session.stub("GET", "/v2/devices/not_found", 404, "", {});
      client.getDevice("not_found", function(err, found) {
	if (err) throw err;
	assert.equal(null, found);
	done();
      });
    });

    it("lists the devices", function(done) {
      var client = _getClient();
      _createDevice(function(device) {
	var stubbedBody = {
	  data: [device]
	};

	client._session.stub("GET", "/v2/devices", 200, JSON.stringify(stubbedBody), {});
	client.listDevices({devices: {key: device.key}}, {chunkedRead: false}, function(device) {
	  assert.equal(device.key, device.key);
	  done();
	});
      });
    });
  });
});
