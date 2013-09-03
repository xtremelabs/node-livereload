fs   = require 'fs'
path = require 'path'
ws   = require 'websocket.io'
http  = require 'http'
url = require 'url'
gaze = require 'gaze'

version = '1.6'
defaultPort = 35729

defaultExts = [
  'html', 'css', 'js', 'png', 'gif', 'jpg',
  'php', 'php5', 'py', 'rb', 'erb'
]

defaultExclusions = [/\.git\//, /\.svn\//, /\.hg\//]

class Server
  constructor: (@config = {}) ->
    
    @config.version ||= version
    @config.port    ||= defaultPort

    @config.exts       ||= []
    @config.exclusions ||= []

    @config.exts       = @config.exts.concat defaultExts
    @config.exclusions = @config.exclusions.concat defaultExclusions

    @config.applyJSLive  ||= false
    @config.applyCSSLive ||= true

    @sockets = []
    
  listen: ->
    @debug "LiveReload is waiting for browser to connect."
    
    if @config.server
      @config.server.listen @config.port
      @server = ws.attach(@config.server)
    else
      @server = ws.listen(@config.port)

    @server.on 'connection', @onConnection.bind @
    @server.on 'close',      @onClose.bind @


  onConnection: (socket) ->
    @debug "Browser connected."
    socket.send "!!ver:#{@config.version}"

    socket.on 'message', (message) =>
      @debug "Browser URL: #{message}"

    @sockets.push socket
    
  onClose: (socket) ->
    @debug "Browser disconnected."


  watch: (path, files = ["css/**", "js/**", "templates/**", "**/*.html"]) ->    
    _this = @;

    gaze files, ->  
      this.on "all", (event, filepath) ->
        console.log ".", filepath.substr(process.cwd().length) , "was ", event
        _this.refresh filepath
        return
      return

  refresh: (path) ->
    @debug "Refresh: #{path}"
    data = JSON.stringify ['refresh',
      path: path,
      apply_js_live: @config.applyJSLive,
      apply_css_live: @config.applyCSSLive
    ]

    for socket in @sockets
      socket.send data

  debug: (str) ->
    if @config.debug
      console.log "#{str}\n"

exports.createServer = (config = {}) ->
  app = http.createServer ( req, res )->
    if url.parse(req.url).pathname is '/livereload.js'
      res.writeHead(200, {'Content-Type': 'text/javascript'})
      res.end fs.readFileSync __dirname + '/../ext/livereload.js'

  config.server ?= app

  server = new Server config
  server.listen()
  server
