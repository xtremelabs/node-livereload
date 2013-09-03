var Server, defaultExclusions, defaultExts, defaultPort, fs, gaze, http, path, url, version, ws;

fs = require('fs');

path = require('path');

ws = require('websocket.io');

http = require('http');

url = require('url');

gaze = require('gaze');

version = '1.6';

defaultPort = 35729;

defaultExts = ['html', 'css', 'js', 'png', 'gif', 'jpg', 'php', 'php5', 'py', 'rb', 'erb'];

defaultExclusions = [/\.git\//, /\.svn\//, /\.hg\//];

Server = (function() {

  function Server(config) {
    var _base, _base1, _base2, _base3, _base4, _base5;
    this.config = config != null ? config : {};
    (_base = this.config).version || (_base.version = version);
    (_base1 = this.config).port || (_base1.port = defaultPort);
    (_base2 = this.config).exts || (_base2.exts = []);
    (_base3 = this.config).exclusions || (_base3.exclusions = []);
    this.config.exts = this.config.exts.concat(defaultExts);
    this.config.exclusions = this.config.exclusions.concat(defaultExclusions);
    (_base4 = this.config).applyJSLive || (_base4.applyJSLive = false);
    (_base5 = this.config).applyCSSLive || (_base5.applyCSSLive = true);
    this.sockets = [];
  }

  Server.prototype.listen = function() {
    this.debug("LiveReload is waiting for browser to connect.");
    if (this.config.server) {
      this.config.server.listen(this.config.port);
      this.server = ws.attach(this.config.server);
    } else {
      this.server = ws.listen(this.config.port);
    }
    this.server.on('connection', this.onConnection.bind(this));
    return this.server.on('close', this.onClose.bind(this));
  };

  Server.prototype.onConnection = function(socket) {
    var _this = this;
    this.debug("Browser connected.");
    socket.send("!!ver:" + this.config.version);
    socket.on('message', function(message) {
      return _this.debug("Browser URL: " + message);
    });
    return this.sockets.push(socket);
  };

  Server.prototype.onClose = function(socket) {
    return this.debug("Browser disconnected.");
  };

  Server.prototype.watch = function(files) {
    files = files || ["css/**", "js/**", "templates/**"];
    return gaze(files, function() {
      var _this = this;
      this.on("all", function(event, filepath) {
        console.log(filepath, "was ", event);
        _this.refresh(filepath);
      });
    });
  };

  Server.prototype.refresh = function(path) {
    var data, socket, _i, _len, _ref, _results;
    this.debug("Refresh: " + path);
    data = JSON.stringify([
      'refresh', {
        path: path,
        apply_js_live: this.config.applyJSLive,
        apply_css_live: this.config.applyCSSLive
      }
    ]);
    _ref = this.sockets;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      socket = _ref[_i];
      _results.push(socket.send(data));
    }
    return _results;
  };

  Server.prototype.debug = function(str) {
    if (this.config.debug) {
      return console.log("" + str + "\n");
    }
  };

  return Server;

})();

exports.createServer = function(config) {
  var app, server, _ref;
  if (config == null) {
    config = {};
  }
  app = http.createServer(function(req, res) {
    if (url.parse(req.url).pathname === '/livereload.js') {
      res.writeHead(200, {
        'Content-Type': 'text/javascript'
      });
      return res.end(fs.readFileSync(__dirname + '/../ext/livereload.js'));
    }
  });
  if ((_ref = config.server) == null) {
    config.server = app;
  }
  server = new Server(config);
  server.listen();
  return server;
};
