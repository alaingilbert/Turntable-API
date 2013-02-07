##
# Copyright 2011,2012 Alain Gilbert <alain.gilbert.15@gmail.com>
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to
# deal in the Software without restriction, including without limitation the
# rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
# sell copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
# IN THE SOFTWARE.
#

WebSocket   = require('./websocket').WebSocket
events      = require('events').EventEmitter
crypto      = require('crypto')
http        = require('http')
net         = require('net')
querystring = require('querystring')



class Bot
  constructor: (auth, userId, roomId=null) ->
    @auth            = auth
    @userId          = userId
    @roomId          = roomId
    @debug           = false
    @stdout          = 'stdout'
    @callback        = ->
    @currentDjId     = null
    @currentSongId   = null
    @lastHeartbeat   = Date.now()
    @lastActivity    = Date.now()
    @clientId        = Date.now() + '-0.59633534294921572'
    @_msgId          = 0
    @_cmds           = []
    @_isConnected    = false
    @fanOf           = []
    @currentStatus   = 'available'
    @currentSearches = []

    if @roomId
      @callback = ->
        rq = { api: 'room.register', roomid: @roomId }
        @_send rq, null

    randomHash = crypto.createHash("sha1")
                 .update(Math.random().toString())
                 .digest('hex').substr(0, 24)

    @connect(@roomId or randomHash)


  connect: (roomId) ->
    if not /^[0-9a-f]{24}$/.test(roomId)
      throw new Error "Invalid roomId: cannot connect to '#{roomId}'"
    @which_server roomId, (host, port) ->
      url  = "ws://#{host}:#{port}/socket.io/websocket"
      @ws = new WebSocket(url)
      @ws.onmessage = @onMessage.bind(@)
      @ws.onclose = @onClose.bind(@)


  listen: (port, address) ->
    self = @
    http.createServer((req, res) ->
      dataStr = ''
      req.on 'data', (chunk) ->
        dataStr += chunk.toString()
      req.on 'end', ->
        data = querystring.parse(dataStr)
        req._POST = data
        self.emit('httpRequest', req, res)
    ).listen(port, address)


  tcpListen: (port, address) ->
    self = @
    net.createServer((socket) ->
      socket.on 'connect', ->
        self.emit('tcpConnect', socket)
      socket.on 'data', (data) ->
        msg = data.toString()
        if msg[msg.length - 1] == '\n'
          self.emit('tcpMessage', socket, msg.substr(0, msg.length-1))
      socket.on 'end', ->
        self.emit('tcpEnd', socket)
    ).listen(port, address)


  setTmpSong: (data) ->
    @tmpSong =
      command : 'endsong'
      room : data.room
      success : true


  onClose: ->
    #console.log 'THIS IS WEIRD AND SHOULD NOT APPEAR.'


  onMessage: (msg) ->
    data = msg.data

    heartbeat_rgx = /~m~[0-9]+~m~(~h~[0-9]+)/
    if data.match heartbeat_rgx
      @_heartbeat data.match(heartbeat_rgx)[1]
      @lastHeartbeat = Date.now()
      @updatePresence()
      return

    if @debug
      if @stdout == 'stderr'
        console.error "> #{data}"
      else
        console.log "> #{data}"

    if msg.data == '~m~10~m~no_session'
      @userAuthenticate ->
        if not @_isConnected
          @getFanOf (data) ->
            @fanOf = data.fanof
            @updatePresence()
            # TODO: I don't like setInterval !
            setInterval(@updatePresence.bind(@), 10000)
            @emit 'ready'
        @callback()
        @_isConnected = true
      return

    @lastActivity = Date.now()

    len_rgx = /~m~([0-9]+)~m~/
    len = data.match(len_rgx)[1]
    json = JSON.parse(data.substr(data.indexOf('{'), len))
    index = 0
    while index < @_cmds.length
      [id, rq, clb] = @_cmds[index]
      is_search = false

      if id == json.msgid
        switch rq.api
          when 'room.info'
            if json.success == true
              currentDj   = json.room.metadata.current_dj
              currentSong = json.room.metadata.current_song
              if currentDj
                @currentDjId = currentDj
              if currentSong
                @currentSongId = currentSong._id
          when 'room.register'
            if json.success == true
              @roomId = rq.roomid
              @roomInfo (data) ->
                @setTmpSong data
                @emit 'roomChanged', data
            else
              @emit 'roomChanged', json
            clb = null
          when 'room.deregister'
            if json.success == true
              @roomId = null
          when 'file.search'
            if json.success == true
              is_search = true
              @currentSearches.push {query: rq.query, callback: clb}

        if not is_search and clb
          clb.call @, json

        @_cmds.splice(i, 1)
        break
      else
        index++

    switch json['command']
      when 'registered'
        @emit 'registered', json
      when 'deregistered'
        @emit 'deregistered', json
      when 'speak'
        @emit 'speak', json
      when 'pmmed'
        @emit 'pmmed', json
      when 'nosong'
        @currentDjId   = null
        @currentSongId = null
        @emit 'endsong', @tmpSong
        @emit 'nosong', json
      when 'newsong'
        if @currentSongId
          @emit 'endsong', @tmpSong
        @currentDjId   = json.room.metadata.current_dj
        @currentSongId = json.room.metadata.current_song._id
        @setTmpSong json
        @emit 'newsong', json
      when 'update_votes'
        if @tmpSong
          @tmpSong.room.metadata.upvotes = json.room.metadata.upvotes
          @tmpSong.room.metadata.downvotes = json.room.metadata.downvotes
          @tmpSong.room.metadata.listeners = json.room.metadata.listeners
        @emit 'update_votes', json
      when 'booted_user'
        @emit 'booted_user', json
      when 'update_user'
        @emit 'update_user', json
      when 'add_dj'
        @emit 'add_dj', json
      when 'rem_dj'
        if json.modid
          json['command'] = 'escort'
          @emit 'escort', json
        @emit 'rem_dj', json
      when 'new_moderator'
        @emit 'new_moderator', json
      when 'rem_moderator'
        @emit 'rem_moderator', json
      when 'snagged'
        @emit 'snagged', json
      when 'search_complete'
        query = json['query']
        for i in [0...@currentSearches.length]
          if @currentSearches[i].query == query and @currentSearches[i].callback
            @currentSearches[i].callback json
            @currentSearches.splice i, 1
            break
      else
        if json['command']
          #console.log('Command: ', json)
        else if typeof(json['msgid']) == 'number'
          if not json['success']
            1 == 1
            #console.log(json)


  _heartbeat: (msg) ->
    @ws.send "~m~#{msg.length}~m~#{msg}"


  toString: -> ''


  _send: (rq, callback) ->
    rq.msgid    = @_msgId
    rq.clientid = @clientId
    rq.userid   = rq.userid or @userId
    rq.userauth = @auth

    msg = JSON.stringify(rq)

    if @debug
      if @stdout == 'stderr'
        console.error "< #{msg}"
      else
        console.log "< #{msg}"

    @ws.send "~m~#{msg.length}~m~#{msg}"
    @_cmds.push [@_msgId, rq, callback]
    @_msgId++


  which_server: (roomid, callback) ->
    self = @
    options =
      host: 'turntable.fm'
      port: 80
      path: "/api/room.which_chatserver?roomid=#{roomid}"
    http.get options, (res) ->
      dataStr = ''
      res.on 'data', (chunk) ->
        dataStr += chunk.toString()
      res.on 'end', ->
        try
          data = JSON.parse dataStr
        catch err
          data = []
        if data[0]
          callback.call(self, data[1].chatserver[0], data[1].chatserver[1])
        else if @debug
          if @stdout == 'stderr'
            console.error "Failed to determine which server to use: #{dataStr}"
          else
            console.log "Failed to determine which server to use: #{dataStr}"


  close: ->
    @ws.close()


  roomNow: (callback) ->
    rq = { api: 'room.now' }
    @_send rq, callback


  updatePresence: (callback) ->
    rq = { api: 'presence.update', status: this.currentStatus }
    @_send rq, callback


  listRooms: (skip, sectionAware, callback) ->
    skip ?= 0
    # so we don't break code from previous revisions
    if typeof sectionAware == 'function' and callback == undefined
      callback = sectionAware
      sectionAware = false
    else if typeof sectionAware != 'boolean'
      sectionAware = false
    rq = { api: 'room.list_rooms', skip: skip, section_aware: sectionAware }
    @_send rq, callback


  directoryGraph: (callback) ->
    rq = { api: 'room.directory_graph' }
    @_send rq, callback


  directoryRooms: (options, callback) ->
    if typeof options != 'object'
      callback = options
      options = {}

    options.client = 'web'

    query = []
    for opt in options
      query.push "#{opt}=#{encodeURIComponent(options[opt])}"

    self = @
    httpOptions =
      host: 'turntable.fm'
      port: 80
      path: '/api/room.directory_rooms?' + query.join("&")
    http.get httpOptions, (res) ->
      dataStr = ''
      res.on 'data', (chunk) ->
        dataStr += chunk.toString()
      res.on 'end', ->
        try
          data = JSON.parse dataStr
        catch err
          data = []
        callback.call self, data


  stalk: ->
    self     = @
    userId   = ''
    allInfos = false
    callback = ->

    switch arguments.length
      when 2
        userId   = arguments[0]
        callback = arguments[1]
      when 3
        userId   = arguments[0]
        allInfos = arguments[1]
        callback = arguments[2]

    getGraph = ->
      self.directoryGraph (directoryGraphData) ->
        if not directoryGraphData.success
          return callback directoryGraphData
        rooms = directoryGraphData.rooms
        for room, users in rooms
          for user in users
            if user.userid == userId
              if allInfos
                return callback roomId: room.roomid, room: room,
                                user: user, success: true
              else
                return callback {roomId: room.roomid, success: true}
        return callback {err: 'userId not found.', success: false}

    if @fanOf.indexOf(userId) != -1
      getGraph()
    else
      @becomeFan userId, (becomeFanData) ->
        if not becomeFanData.success
          if becomeFanData.err != 'User is already a fan'
            return callback becomeFanData
        getGraph()


  getFavorites: (callback) ->
    rq = { api: 'room.get_favorites' }
    @_send rq, callback


  addFavorite: (roomId, callback) ->
    rq = { api: 'room.add_favorite', roomid: roomId }
    @_send rq, callback


  remFavorite: (roomId, callback) ->
    rq = { api: 'room.rem_favorite', roomid: roomId }
    @_send(rq, callback)


  roomRegister: (roomId, callback) ->
    if @ws
      @ws.onclose = ->
      @ws.close()
    @callback = ->
      rq = { api: 'room.register', roomid: roomId }
      @_send rq, callback
    @connect roomId


  roomDeregister: (callback) ->
    rq = { api: 'room.deregister', roomid: @roomId }
    @_send rq, callback


  roomInfo: ->
    rq = { api: 'room.info', roomid: @roomId }
    callback = null
    if arguments.length == 1
      if typeof arguments[0] == 'function'
        callback = arguments[0]
      else if arguments[0] == 'boolean'
        rq.extended = arguments[0]
    else if arguments.length == 2
      rq.extended = arguments[0]
      callback    = arguments[1]
    @_send rq, callback


  speak: (msg, callback) ->
    rq = api: 'room.speak', roomid: @roomId, text: msg.toString()
    @_send rq, callback


  pm: (msg, userid, callback) ->
    rq = api: 'pm.send', receiverid: userid, text: msg.toString()
    @_send rq, callback


  pmHistory: (userid, callback) ->
    rq = api: 'pm.history', receiverid: userid
    @_send rq, callback


  bootUser: (userId, reason, callback) ->
    rq =
      api: 'room.boot_user'
      roomid: @roomId
      target_userid: userId
      reason: reason
    @_send rq, callback


  boot: ->
    @bootUser.apply @, arguments


  addModerator: (userId, callback) ->
    rq =
      api: 'room.add_moderator'
      roomid: @roomId
      target_userid: userId
    @_send rq, callback


  remModerator: (userId, callback) ->
    rq =
      api: 'room.rem_moderator'
      roomid: @roomId
      target_userid: userId
    @_send rq, callback


  addDj: (callback) ->
    rq = api: 'room.add_dj', roomid: @roomId
    @_send rq, callback


  remDj: ->
    if arguments.length == 1
      if typeof arguments[0] == 'function'
        djId     = null
        callback = arguments[0]
      else if typeof arguments[0] == 'string'
        djId     = arguments[0]
        callback = null
    else if arguments.length == 2
      djId     = arguments[0]
      callback = arguments[1]
    rq = api: 'room.rem_dj', roomid: @roomId
    if djId
      rq.djid = djId
    @_send rq, callback


  stopSong: (callback) ->
    rq = api: 'room.stop_song', roomid: @roomId
    @_send rq, callback


  skip: ->
    @stopSong.apply @, arguments


  snag: (callback) ->
    sh = crypto.createHash("sha1")
               .update(Math.random().toString())
               .digest('hex')
    fh = crypto.createHash("sha1")
               .update(Math.random().toString())
               .digest('hex')

    i  = [@userId, @currentDjId, @currentSongId, @roomId,
          'queue', 'board', 'false', 'false', sh]
    vh = crypto.createHash("sha1").update(i.join('/')).digest('hex')

    rq =
      api      : 'snag.add'
      djid     : @currentDjId
      songid   : @currentSongId
      roomid   : @roomId
      site     : 'queue'
      location : 'board'
      in_queue : 'false'
      blocked  : 'false'
      vh       : vh
      sh       : sh
      fh       : fh

    @_send rq, callback


  vote: (val, callback) ->
    val      = arguments[0] or 'up'
    callback = arguments[1] or null
    vh       = crypto.createHash("sha1")
                     .update(@roomId + val + @currentSongId)
                     .digest('hex')
    th       = crypto.createHash("sha1")
                     .update(Math.random().toString())
                     .digest('hex')
    ph       = crypto.createHash("sha1")
                     .update(Math.random().toString())
                     .digest('hex')
    rq =
      api: 'room.vote'
      roomid: @roomId
      val: val, vh: vh, th: th, ph: ph

    @_send rq, callback


  bop: ->
    args = Array.prototype.slice.call(arguments)
    args.unshift('up')
    @vote.apply(@, args)


  userAuthenticate: (callback) ->
    rq = api: 'user.authenticate'
    @_send rq, callback


  userInfo: (callback) ->
    rq = api: 'user.info'
    @_send rq, callback


  userAvailableAvatars: (callback) ->
    rq = api: 'user.available_avatars'
    @_send rq, callback


  getAvatarIds: (callback) ->
    @userInfo (userInfos) ->
      points = userInfos.points or -1
      acl = userInfos.acl or 0
      @userAvailableAvatars (avatars) ->
        res = []
        for avatar in avatars.avatars
          if points >= avatar.min
            if avatar.acl and acl < avatar.acl
              continue
            for id in avatar.avatarids
              if res.indexOf(id) == -1
                res.push id
        callback {ids: res, success: true}


  getFanOf: (callback) ->
    rq = api: 'user.get_fan_of'
    @_send(rq, callback)


  getFans: (callback) ->
    rq = api: 'user.get_fans'
    @_send rq, callback


  getUserId: (name, callback) ->
    rq = api: 'user.get_id', name: name.toString()
    @_send rq, callback


  getProfile: ->
    rq = api: 'user.get_profile'
    callback = null
    if arguments.length == 1
      if typeof arguments[0] == 'function'
        callback = arguments[0]
      else if typeof arguments[0] == 'string'
        rq.userid = arguments[0]
    else if arguments.length == 2
      rq.userid = arguments[0]
      callback  = arguments[1]
    @_send rq, callback


  modifyProfile: (profile, callback) ->
    rq = api: 'user.modify_profile'
    if profile.name       then rq.name       = profile.name
    if profile.twitter    then rq.twitter    = profile.twitter
    if profile.facebook   then rq.facebook   = profile.facebook
    if profile.website    then rq.website    = profile.website
    if profile.about      then rq.about      = profile.about
    if profile.topartists then rq.topartists = profile.topartists
    if profile.hangout    then rq.hangout    = profile.hangout
    @_send rq, callback


  modifyLaptop: (laptop, callback) ->
    laptop = laptop or 'linux'
    rq = api: 'user.modify', laptop: laptop
    @_send rq, callback


  modifyName: (name, callback) ->
    rq = api: 'user.modify', name: name
    @_send rq, callback


  setAvatar: (avatarId, callback) ->
    rq = api: 'user.set_avatar', avatarid: avatarId
    @_send rq, callback


  becomeFan: (userId, callback) ->
    rq = api: 'user.become_fan', djid: userId
    @_send rq, callback


  removeFan: (userId, callback) ->
    rq = api: 'user.remove_fan', djid: userId
    @_send rq, callback


  playlistAll: ->
    playlistName = 'default'
    callback     = null
    switch arguments.length
      when 1
        if typeof arguments[0] == 'string'
          playlistName = arguments[0]
        else if typeof arguments[0] == 'function'
          callback     = arguments[0]
      when 2
        playlistName = arguments[0]
        callback     = arguments[1]
    rq = api: 'playlist.all', playlist_name: playlistName
    @_send rq, callback


  playlistAdd: ->
    playlistName = 'default'
    songId       = null
    index        = 0
    callback     = null
    switch arguments.length
      when 1
        songId = arguments[0]
      when 2
        if typeof arguments[0] == 'string' and
           typeof arguments[1] == 'string'
          playlistName = arguments[0]
          songId       = arguments[1]
        else if typeof arguments[0] == 'string' and
                typeof arguments[1] == 'function'
          songId       = arguments[0]
          callback     = arguments[1]
        else if typeof arguments[0] == 'string' and
                typeof arguments[1] == 'number'
          songId       = arguments[0]
          index        = arguments[1]
        else if typeof arguments[0] == 'boolean' and
                typeof arguments[1] == 'string'
          songId       = arguments[1]
      when 3
        if typeof arguments[0] == 'string' and
           typeof arguments[1] == 'string' and
           typeof arguments[2] == 'number'
          playlistName = arguments[0]
          songId       = arguments[1]
          index        = arguments[2]
        else if typeof arguments[0] == 'string' and
                typeof arguments[1] == 'string' and
                typeof arguments[2] == 'function'
          playlistName = arguments[0]
          songId       = arguments[1]
          callback     = arguments[2]
        else if typeof arguments[0] == 'string' and
                typeof arguments[1] == 'number' and
                typeof arguments[2] == 'function'
          songId       = arguments[0]
          index        = arguments[1]
          callback     = arguments[2]
        else if typeof arguments[0] == 'boolean' and
                typeof arguments[1] == 'string' and
                typeof arguments[2] == 'function'
          songId       = arguments[1]
          callback     = arguments[2]
      when 4
        playlistName = arguments[0]
        songId       = arguments[1]
        index        = arguments[2]
        callback     = arguments[3]
    rq =
      api: 'playlist.add',
      playlist_name: playlistName
      song_dict: { fileid: songId }
      index: index
    @_send rq, callback


  playlistRemove: ->
    playlistName = 'default'
    index        = 0
    callback     = null

    switch arguments.length
      when 1
        index = arguments[0]
      when 2
        if typeof arguments[0] == 'string' and
           typeof arguments[1] == 'number'
          playlistName = arguments[0]
          index        = arguments[1]
        else if typeof arguments[0] == 'number' and
                typeof arguments[1] == 'function'
          index        = arguments[0]
          callback     = arguments[1]
      when 3
        playlistName = arguments[0]
        index        = arguments[1]
        callback     = arguments[2]
    rq =
      api: 'playlist.remove'
      playlist_name: playlistName
      index: index
    @_send rq, callback


  playlistReorder: ->
    playlistName = 'default'
    indexFrom    = 0
    indexTo      = 0
    callback     = null
    switch arguments.length
      when 2
        indexFrom = arguments[0]
        indexTo   = arguments[1]
      when 3
        if typeof arguments[0] == 'string' and
           typeof arguments[1] == 'number' and
           typeof arguments[2] == 'number'
          playlistName = arguments[0]
          indexFrom    = arguments[1]
          indexTo      = arguments[2]
        else if typeof arguments[0] == 'number' and
                 typeof arguments[1] == 'number' and
                 typeof arguments[2] == 'function'
          indexFrom    = arguments[0]
          indexTo      = arguments[1]
          callback     = arguments[2]
      when 4
        playlistName = arguments[0]
        indexFrom    = arguments[1]
        indexTo      = arguments[2]
        callback     = arguments[3]
     rq =
       api: 'playlist.reorder'
       playlist_name: playlistName
       index_from: indexFrom
       index_to: indexTo
    @_send rq, callback


  setStatus: (status, callback) ->
    @currentStatus = status
    @updatePresence()
    if callback
      callback { success: true }


  searchSong: (query, callback) ->
    rq = api: 'file.search', query: query
    @_send rq, callback


  getStickers: (callback) ->
    rq = api: 'sticker.get'
    @_send rq, callback


  getStickerPlacements: (userid, callback) ->
    rq = api: 'sticker.get_placements', userid: userid
    @_send rq, callback


  placeStickers: (placements, callback) ->
    rq =
      api: 'sticker.place'
      placements: placements
      is_dj: true
      roomid: @roomId
    @_send rq, callback


Bot::__proto__ = events.prototype

exports.Bot = Bot
