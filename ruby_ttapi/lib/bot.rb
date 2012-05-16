require "websocket"
require "set"
require "uri"
require "net/http"
require "rubygems"
require "json"

class Bot
   attr_accessor :debug, :speak

   def initialize(auth, userId, roomId)
      @auth          = auth
      @userId        = userId
      @roomId        = roomId
      @debug         = false
      @callback      = nil
      @currentDjId   = nil
      @currentSongId = nil
      @lastHeartbeat = Time.now
      @lastActivity  = Time.now
      @clientId      = '%s-0.59633534294921572' % Time.now.to_i
      @_msgId        = 0
      @_cmds         = []
      @_isConnected  = false
      @fanOf         = Set.new
      @currentStatus = "available"
      @signals       = {}

      connect(@roomId)
   end


   def connect(roomId)
      uri = URI.parse("http://turntable.fm:80/api/room.which_chatserver?roomid=%s" % @roomId)
      response = Net::HTTP.get_response(uri)
      data = JSON.parse(response.body)
      host, port = data[1]["chatserver"][0], data[1]["chatserver"][1]
      url = "ws://%s:%s/socket.io/websocket" % [host, port]
      @ws = WebSocket.new(url)
      if @roomId
         def clb
            rq = { "api" => "room.register", "roomid" => @roomId }
            _send(rq, nil)
         end
         @callback = method(:clb)
      end
   end


   def setTmpSong(data)
      tmpSong = { "command" => "endsong", "room" => data["room"], "success" => true }
   end


   def on_message(msg)
      heartbeat_rgx = /~m~[0-9]+~m~(~h~[0-9]+)/
      if heartbeat_rgx.match(msg)
         _heartbeat(heartbeat_rgx.match(msg)[1])
         @lastHeartbeat = Time.now
         updatePresence()
         return
      end

      if @debug
         puts "> %s" % msg
      end

      if msg == "~m~10~m~no_session"
         def clb(obj)
            if not @isConnected
               def fanof(data)
                  @fanOf |= Set.new(data["fanof"])
                  updatePresence()
                  # TODO: setInterval ????
                  emit("ready")
               end
               getFanOf(method(:fanof))
            end
            @callback.call()
            @isConnected = true
         end
         userAuthenticate(method(:clb))
         return
      end

      @lastActivity = Time.now
      len_rgx = /~m~([0-9]+)~m~/
      len = len_rgx.match(msg)[1]
      obj = JSON.parse(msg[msg.index("{"), msg.length])
      for id, rq, clb in @_cmds
         if id == obj["msgid"]
            if rq["api"] == "room.info"
               if obj["success"]
                  currentDj = obj["room"]["metadata"]["current_dj"]
                  currentSong = obj["room"]["metadata"]["current_song"]
                  if currentDj
                     @currentDj = currentDj
                  end
                  if currentSong
                     @currentSongId = currentSong["_id"]
                  end
               end

            elsif rq["api"] == "room.register"
               if obj["success"]
                  @roomId = rq["roomid"]
                  def info_clb(data)
                     setTmpSong(data)
                     emit("roomChanged", data)
                  end
                  roomInfo(method(:info_clb))
               else
                  emit("roomChanged", obj)
               end
               clb = nil

            elsif rq["api"] == "room.deregister"
               if obj["success"]
                  @roomId = nil
               end
            end

            if clb
               clb.call(obj)
            end

            @_cmds.delete([id, rq, clb])
            break
         end
      end

      if obj["command"] == "registered"
         emit("registered", obj)
      elsif obj["command"] == "deregistered"
         emit("deregistered", obj)
      elsif obj["command"] == "speak"
         emit("speak", obj)
      elsif obj["command"] == "pmmed"
         emit("pmmed", obj)
      elsif obj["command"] == "nosong"
         @currentDjId = nil
         @currentSongId = nil
         emit("endsong", @tmpSong)
         emit("nosong", obj)
      elsif obj["command"] == "newsong"
         if @currentSongId
            emit("endsong", @tmpSong)
         end
         @currentDjId = obj["room"]["metadata"]["current_dj"]
         @currentSongId = obj["room"]["metadata"]["current_song"]["_id"]
         setTmpSong(obj)
         emit("newsong", obj)
      elsif obj["command"] == "update_votes"
         if @tmpSong
            @tmpSong["room"]['metadata']['upvotes']   = obj['room']['metadata']['upvotes']
            @tmpSong['room']['metadata']['downvotes'] = obj['room']['metadata']['downvotes']
            @tmpSong['room']['metadata']['listeners'] = obj['room']['metadata']['listeners']
         end
         emit("update_votes", obj)
      elsif obj["command"] == "booted_user"
         emit('booted_user', obj)
      elsif obj["command"] == "update_user"
         emit('update_user', obj)
      elsif obj["command"] == "add_dj"
         emit('add_dj', obj)
      elsif obj["command"] == "rem_dj"
         emit('rem_dj', obj)
      elsif obj["command"] == "new_moderator"
         emit('new_moderator', obj)
      elsif obj["command"] == "rem_moderator"
         emit('rem_moderator', obj)
      elsif obj["command"] == "snagged"
         emit('snagged', obj)
      end
   end


   def _heartbeat(msg)
      @ws.send('~m~%s~m~%s' % [msg.length, msg])
      @_msgId += 1
   end


   def _send(rq, callback=nil)
      rq["msgid"] = @_msgId
      rq["clientid"] = @clientId
      if not rq["userid"]
         rq["userid"] = @userId
      end
      rq["userauth"] = @auth

      msg = JSON.generate(rq)

      if @debug
         puts "< %s" % msg
      end

      @ws.send('~m~%s~m~%s' % [msg.length, msg])
      @_cmds.push([@_msgId, rq, callback])
      @_msgId += 1
   end


   def roomNow(callback=nil)
      rq = { "api" => "room.now" }
      _send(rq, callback)
   end


   def updatePresence(callback=nil)
      rq = { "api" => "presence.update", "status" => @currentStatus }
      _send(rq, callback)
   end


   def listRooms(skip=nil, callback=nil)
      if not skip
         skip = 0
      end
      rq = { "api" => "room.list_rooms", "skip" => skip }
      _sned(rq, callback)
   end


   def directoryGraph(callback=nil)
      rq = { "api" => "room.directory_graph" }
      _send(rq, callback)
   end


   # TODO
   def stalk(*args)
   end


   def getFavorites(callback=nil)
      rq = { "api" => "room.get_favorites" }
      _send(rq, callback)
   end


   def addFavorite(roomId, callback=nil)
      rq = { "api" => "room.add_favorite", "roomid" => roomId }
      _send(rq, callback)
   end


   def remFavorite(roomId, callback=nil)
      rq = { "api" => "room.rem_favorite", "roomid" => roomId }
      _send(rq, callback)
   end


   # TODO
   def roomRegister(callback=nil)
   end


   def roomDeregister(callback=nil)
      rq = { "api" => "room.deregister", "roomid" => @roomId }
      _send(rq, callback)
   end


   def roomInfo(*args)
      rq = { "api" => "room.info", "roomid" => @roomId }
      callback = args[0]
      _send(rq, callback)
   end


   def speak(msg, callback=nil)
      rq = { "api" => "room.speak", "roomid" => @roomId, "text" => msg.to_s }
      _send(rq, callback)
   end


   def pm(msg, userid, callback=nil)
      rq = { "api" => "pm.send", "receiverid" => userid, "text" => msg.to_s }
      _send(rq, callback)
   end


   def pmHistory(userid, callback=nil)
      rq = { "api" => "pm.history", "receiverid" => userid }
      _send(rq, callback)
   end


   def bootUser(userId, reason="", callback=nil)
      rq = { "api" => "room.boot_user", "roomid" => @roomId, "target_userid" => userId, "reason" => reason }
      _send(rq, callback)
   end


   def boot(userId, reason="", callback=nil)
      bootUser(userId, reason, callback)
   end


   def addModerator(userId, callback=nil)
      rq = { "api" => "room.add_moderator", "roomid" => @roomId, "target_userid" => userId }
      _send(rq, callback)
   end


   def remModerator(userId, callback=nil)
      rq = { "api" => "room.rem_moderator", "roomid" => @roomId, "target_userid" => userId }
      _send(rq, callback)
   end


   def addDj(callback=nil)
      rq = { "api" => "room.add_dj", "roomid" => @roomId }
      _send(rq, callback)
   end


   # TODO
   def remDj(*args)
   end


   def stopSong(callback=nil)
      rq = { "api" => "room.stop_song", "roomid" => @roomId }
      _send(rq, callback)
   end


   def skip(callback=nil)
      stopSong(callback)
   end


   # TODO
   def snag(callback=nil)
   end


   # TODO
   def vote
   end


   # TODO
   def bop
   end


   def userAuthenticate(callback)
      rq = { "api" => "user.authenticate" }
      _send(rq, callback)
   end


   def userInfo(callback=nil)
      rq = { "api" => "user.info" }
      _send(rq, callback)
   end

   def getFanOf(callback=nil)
      rq = { "api" => "user.get_fan_of" }
      _send(rq, callback)
   end

   def getFans(callback=nil)
      rq = { "api" => "user.get_fans" }
      _send(rq, callback)
   end

   def getUserId(username, callback=nil)
      rq = { "api" => "user.get_id", "name" => username }
      _send(rq, callback)
   end

   def getStickers(callback=nil)
      rq = { "api" => "sticker.get" }
      _send(rq, callback)
   end

   def getStickerPlacements(userid, callback=nil)
      rq = { "api" => "sticker.get_placements", userid: userid }
      _send(rq, callback)
   end

   # TODO
   def getProfile
   end


   # TODO
   def modifyProfile
   end


   def modifyLaptop(laptop="linux", callback=nil)
      rq = { "api" => "user.modify", "laptop" => laptop }
      _send(rq, callback)
   end


   def modifyName(name, callback=nil)
      rq = { "api" => "user.modify", "name" => name }
      _send(rq, callback)
   end


   def setAvatar(avatarId, callback=nil)
      rq = { "api" => "user.set_avatar", "avatarid" => avatarId }
      _send(rq, callback)
   end


   def becomeFan(userId, callback=nil)
      rq = { "api" => "user.become_fan", "djid" => userId }
      _send(rq, callback)
   end


   def removeFan(userId, callback=nil)
      rq = { "api" => "user.remove_fan", "djid" => userId }
      _send(rq, callback)
   end


   # TODO
   def playlistAll
   end


   # TODO
   def playlistAdd
   end


   # TODO
   def playlistRemove
   end


   # TODO
   def playlistReorder
   end


   def setStatus(st, callback)
      @currentStatus = st
      updatePresence()
      if callback
         callback({ "success" => true })
      end
   end


   def emit(signal, data=nil)
      callbacks = @signals[signal]
      callbacks = [] if not callbacks
      for clb in callbacks
         clb.call(data)
      end
   end


   def on(signal, callback)
      if not @signals[signal]
         @signals[signal] = []
      end
      @signals[signal].push(callback)
   end


   def start
      while data = @ws.receive()
         on_message(data)
      end
   end
end
