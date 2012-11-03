/**
 * Copyright 2011,2012 Alain Gilbert <alain.gilbert.15@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

var WebSocket   = require('./websocket').WebSocket
  , events      = require('events').EventEmitter
  , crypto      = require('crypto')
  , http        = require('http')
  , net         = require('net')
  , querystring = require('querystring');



var Bot = function () {
  this.auth            = arguments[0];
  this.userId          = arguments[1];
  if (arguments.length == 3) {
    this.roomId        = arguments[2];
  } else {
    this.roomId        = null;
  }
  this.debug           = false;
  this.stdout          = 'stdout';
  this.callback        = function () {};
  this.currentDjId     = null;
  this.currentSongId   = null;
  this.lastHeartbeat   = Date.now();
  this.lastActivity    = Date.now();
  this.clientId        = Date.now() + '-0.59633534294921572';
  this._msgId          = 0;
  this._cmds           = [];
  this._isConnected    = false;
  this.fanOf           = [];
  this.currentStatus   = 'available';
  this.currentSearches = [];

  if (this.roomId) {
    this.callback = function() {
      var rq = { api: 'room.register', roomid: this.roomId };
      this._send(rq, null);
    };
  }
  this.connect(this.roomId ?
      this.roomId :
      crypto.createHash("sha1")
            .update(Math.random().toString())
            .digest('hex').substr(0, 24));
};
Bot.prototype.__proto__ = events.prototype;


Bot.prototype.connect = function (roomId) {
  if (!/^[0-9a-f]{24}$/.test(roomId)) {
    throw new Error('Invalid roomId: cannot connect to "' + roomId + '"');
  }
  this.which_server(roomId, function (host, port) {
    var url  = 'ws://' + host + ':' + port + '/socket.io/websocket';
    this.ws = new WebSocket(url);
    this.ws.onmessage = this.onMessage.bind(this);
    this.ws.onclose = this.onClose.bind(this);
  });
};


Bot.prototype.listen = function (port, address) {
  var self = this;
  http.createServer(function (req, res) {
    var dataStr = '';
    req.on('data', function (chunk) {
      dataStr += chunk.toString();
    });
    req.on('end', function () {
      var data = querystring.parse(dataStr);
      req._POST = data;
      self.emit('httpRequest', req, res);
    });
  }).listen(port, address);
};


Bot.prototype.tcpListen = function (port, address) {
  var self = this;
  net.createServer(function (socket) {
    socket.on('connect', function () {
      self.emit('tcpConnect', socket);
    });
    socket.on('data', function (data) {
      var msg = data.toString();
      if (msg[msg.length - 1] == '\n') {
        self.emit('tcpMessage', socket, msg.substr(0, msg.length-1));
      }
    });
    socket.on('end', function () {
      self.emit('tcpEnd', socket);
    });
  }).listen(port, address);
};


Bot.prototype.setTmpSong = function (data) {
  this.tmpSong = { command : 'endsong',
                   room : data.room,
                   success : true };
};


Bot.prototype.onClose = function () {
  //console.log('THIS IS WEIRD AND SHOULD NOT APPEAR.');
};


Bot.prototype.onMessage = function (msg) {
  var data = msg.data;

  var heartbeat_rgx = /~m~[0-9]+~m~(~h~[0-9]+)/;
  if (data.match(heartbeat_rgx)) {
    this._heartbeat(data.match(heartbeat_rgx)[1]);
    this.lastHeartbeat = Date.now();
    this.updatePresence();
    return;
  }

  if (this.debug) {
    if (this.stdout == 'stderr') { console.error('> ' + data); }
    else                         { console.log('> ' + data);   }
  }

  if (msg.data == '~m~10~m~no_session') {
    this.userAuthenticate(function () {
      if (!this._isConnected) {
        this.getFanOf(function (data) {
          this.fanOf = data.fanof;
          this.updatePresence();
          // TODO: I don't like setInterval !
          setInterval(this.updatePresence.bind(this), 10000);
          this.emit('ready');
        });
      }
      this.callback();
      this._isConnected = true;
    });
    return;
  }

  this.lastActivity = Date.now();

  var len_rgx = /~m~([0-9]+)~m~/;
  var len = data.match(len_rgx)[1];
  var json = JSON.parse(data.substr(data.indexOf('{'), len));
  for (var i = 0; i < this._cmds.length; i++) {
    var id  = this._cmds[i][0];
    var rq  = this._cmds[i][1];
    var clb = this._cmds[i][2];
    var is_search = false;

    if (id == json.msgid) {
      switch (rq.api) {
        case 'room.info':
          if (json.success === true) {
            var currentDj   = json.room.metadata.current_dj;
            var currentSong = json.room.metadata.current_song;
            if (currentDj) {
              this.currentDjId = currentDj;
            }
            if (currentSong) {
              this.currentSongId = currentSong._id;
            }
          }
          break;
        case 'room.register':
          if (json.success === true) {
            this.roomId = rq.roomid;
            this.roomInfo(function (data) {
              this.setTmpSong(data);
              this.emit('roomChanged', data);
            });
          } else {
            this.emit('roomChanged', json);
          }
          clb = null;
          break;
        case 'room.deregister':
          if (json.success === true) {
            this.roomId = null;
          }
          break;
        case 'file.search':
          if (json.success === true) {
            is_search = true;
            this.currentSearches.push({query: rq.query, callback: clb});
          }
          break;
      }

      if (!is_search && clb) {
        clb.call(this, json);
      }

      this._cmds.splice(i, 1);
      break;
    }
  }

  switch(json['command']) {
    case 'registered':
      this.emit('registered', json);
      break;
    case 'deregistered':
      this.emit('deregistered', json);
      break;
    case 'speak':
      this.emit('speak', json);
      break;
    case 'pmmed':
      this.emit('pmmed', json);
      break;
    case 'nosong':
      this.currentDjId   = null;
      this.currentSongId = null;
      this.emit('endsong', this.tmpSong);
      this.emit('nosong', json);
      break;
    case 'newsong':
      if (this.currentSongId) {
        this.emit('endsong', this.tmpSong);
      }
      this.currentDjId   = json.room.metadata.current_dj;
      this.currentSongId = json.room.metadata.current_song._id;
      this.setTmpSong(json);
      this.emit('newsong', json);
      break;
    case 'update_votes':
      if (this.tmpSong) {
        this.tmpSong.room.metadata.upvotes = json.room.metadata.upvotes;
        this.tmpSong.room.metadata.downvotes = json.room.metadata.downvotes;
        this.tmpSong.room.metadata.listeners = json.room.metadata.listeners;
      }
      this.emit('update_votes', json);
      break;
    case 'booted_user':
      this.emit('booted_user', json);
      break;
    case 'update_user':
      this.emit('update_user', json);
      break;
    case 'add_dj':
      this.emit('add_dj', json);
      break;
    case 'rem_dj':
      this.emit('rem_dj', json);
      break;
    case 'new_moderator':
      this.emit('new_moderator', json);
      break;
    case 'rem_moderator':
      this.emit('rem_moderator', json);
      break;
    case 'snagged':
      this.emit('snagged', json);
      break;
    case 'search_complete':
      var query = json['query'];
      for (var i = 0; i < this.currentSearches.length; i++) {
        if (this.currentSearches[i].query == query &&
          this.currentSearches[i].callback) {
          this.currentSearches[i].callback(json);
          this.currentSearches.splice(i, 1);
          break;
        }
      }
      break;
    default:
      if (json['command']) {
        //console.log('Command: ', json);
      } else if (typeof(json['msgid']) == 'number') {
        if (!json['success']) {
          //console.log(json);
        }
      }
  }
};


Bot.prototype._heartbeat = function (msg) {
  this.ws.send('~m~'+msg.length+'~m~'+msg);
};


Bot.prototype.toString = function () {
  return '';
};


Bot.prototype._send = function (rq, callback) {
  rq.msgid    = this._msgId;
  rq.clientid = this.clientId;
  rq.userid   = rq.userid || this.userId;
  rq.userauth = this.auth;

  var msg = JSON.stringify(rq);

  if (this.debug) {
    if (this.stdout == 'stderr') { console.error('< ' + msg); }
    else                         { console.log('< ' + msg);   }
  }

  this.ws.send('~m~'+msg.length+'~m~'+msg);
  this._cmds.push([this._msgId, rq, callback]);
  this._msgId++;
};


Bot.prototype.which_server = function (roomid, callback) {
  var self = this;
  var options = { host: 'turntable.fm', port: 80,
                  path: '/api/room.which_chatserver?roomid=' + roomid };
  http.get(options, function (res) {
    var dataStr = '';
    res.on('data', function (chunk) {
      dataStr += chunk.toString();
    });
    res.on('end', function () {
      var data;
      try {
        data = JSON.parse(dataStr);
      } catch (e) {
        data = [];
      }
      if (data[0]) {
        callback.call(self, data[1].chatserver[0], data[1].chatserver[1]);
      } else if (this.debug) {
        if (this.stdout == 'stderr') {
          console.error('Failed to determine which server to use: ' +
              dataStr);
        } else {
          console.log('Failed to determine which server to use: ' +
              dataStr);
        }
      }
    });
  });
};


Bot.prototype.close = function () {
  this.ws.close();
};


Bot.prototype.roomNow = function (callback) {
  var rq = { api: 'room.now' };
  this._send(rq, callback);
};


Bot.prototype.updatePresence = function (callback) {
  var rq = { api: 'presence.update', status: this.currentStatus };
  this._send(rq, callback);
};


Bot.prototype.listRooms = function (skip, callback) {
  skip = skip !== undefined ? skip : 0;
  var rq = { api: 'room.list_rooms', skip: skip };
  this._send(rq, callback);
};


Bot.prototype.directoryGraph = function (callback) {
  var rq = { api: 'room.directory_graph' };
  this._send(rq, callback);
};


Bot.prototype.stalk = function () {
  var self     = this
    , userId   = ''
    , allInfos = false
    , callback = function () {};

  switch (arguments.length) {
  case 2:
    userId   = arguments[0];
    callback = arguments[1];
    break;
  case 3:
    userId   = arguments[0];
    allInfos = arguments[1];
    callback = arguments[2];
    break;
  }

  var getGraph = function() {
    self.directoryGraph(function (directoryGraphData) {
      if (!directoryGraphData.success) {
        return callback(directoryGraphData);
      }
      for (var i = 0; i < directoryGraphData.rooms.length; i++) {
        var room  = directoryGraphData.rooms[i][0];
        var users = directoryGraphData.rooms[i][1];
        for (var j=0; j<users.length; j++) {
          var user = users[j];
          if (user.userid == userId) {
            if (allInfos) {
              return callback({ roomId: room.roomid, room: room,
                                user: user, success: true });
            } else {
              return callback({ roomId: room.roomid, success: true });
            }
          }
        }
      }
      return callback({ err: 'userId not found.', success: false });
    });
  }

  if (this.fanOf.indexOf(userId) != -1) {
    getGraph();
  } else {
    this.becomeFan(userId, function (becomeFanData) {
      if (!becomeFanData.success) {
        if (becomeFanData.err != 'User is already a fan') {
          return callback(becomeFanData);
        }
      }
      getGraph();
    });
  }
};


Bot.prototype.getFavorites = function (callback) {
  var rq = { api: 'room.get_favorites' };
  this._send(rq, callback);
};


Bot.prototype.addFavorite = function (roomId, callback) {
  var rq = { api: 'room.add_favorite', roomid: roomId };
  this._send(rq, callback);
};


Bot.prototype.remFavorite = function (roomId, callback) {
  var rq = { api: 'room.rem_favorite', roomid: roomId };
  this._send(rq, callback);
};


Bot.prototype.roomRegister = function (roomId, callback) {
  if (this.ws) {
    this.ws.onclose = function () {};
    this.ws.close();
  }
  this.callback = function () {
    var rq = { api: 'room.register', roomid: roomId };
    this._send(rq, callback);
  };
  this.connect(roomId);
};


Bot.prototype.roomDeregister = function (callback) {
  var rq = { api: 'room.deregister', roomid: this.roomId };
  this._send(rq, callback);
};


Bot.prototype.roomInfo = function () {
  var rq = { api: 'room.info', roomid: this.roomId };
  var callback = null;
  if (arguments.length == 1) {
    if (typeof arguments[0] === 'function') {
      callback = arguments[0];
    } else if (arguments[0] === 'boolean') {
      rq.extended = arguments[0];
    }
  } else if (arguments.length == 2) {
    rq.extended = arguments[0];
    callback    = arguments[1];
  }
  this._send(rq, callback);
};


Bot.prototype.speak = function (msg, callback) {
  var rq = { api: 'room.speak', roomid: this.roomId, text: msg.toString() };
  this._send(rq, callback);
};


Bot.prototype.pm = function (msg, userid, callback) {
  var rq = { api: 'pm.send', receiverid: userid, text: msg.toString() };
  this._send(rq, callback);
};


Bot.prototype.pmHistory = function (userid, callback) {
  var rq = { api: 'pm.history', receiverid: userid };
  this._send(rq, callback);
};


Bot.prototype.bootUser = function (userId, reason, callback) {
  var rq = { api: 'room.boot_user',
             roomid: this.roomId,
             target_userid: userId,
             reason: reason };
  this._send(rq, callback);
};


Bot.prototype.boot = function () {
  this.bootUser.apply(this, arguments);
};


Bot.prototype.addModerator = function (userId, callback) {
  var rq = { api: 'room.add_moderator',
             roomid: this.roomId,
             target_userid: userId };
  this._send(rq, callback);
};


Bot.prototype.remModerator = function (userId, callback) {
  var rq = { api: 'room.rem_moderator',
             roomid: this.roomId,
             target_userid: userId };
  this._send(rq, callback);
};


Bot.prototype.addDj = function (callback) {
  var rq = { api: 'room.add_dj', roomid: this.roomId };
  this._send(rq, callback);
};


Bot.prototype.remDj = function () {
  if (arguments.length == 1) {
    if (typeof arguments[0] === 'function') {
      var djId     = null;
      var callback = arguments[0];
    } else if (typeof arguments[0] === 'string') {
      var djId     = arguments[0];
      var callback = null;
    }
  } else if (arguments.length == 2) {
    var djId     = arguments[0];
    var callback = arguments[1];
  }
  var rq = { api: 'room.rem_dj', roomid: this.roomId };
  if (djId) { rq.djid = djId; }
  this._send(rq, callback);
};


Bot.prototype.stopSong = function (callback) {
  var rq = { api: 'room.stop_song', roomid: this.roomId };
  this._send(rq, callback);
};


Bot.prototype.skip = function () {
  this.stopSong.apply(this, arguments);
};


Bot.prototype.snag = function (callback) {
  var sh = crypto.createHash("sha1")
             .update(Math.random().toString())
             .digest('hex');
  var fh = crypto.createHash("sha1")
             .update(Math.random().toString())
             .digest('hex');

  var i  = [this.userId, this.currentDjId, this.currentSongId, this.roomId,
            'queue', 'board', 'false', 'false', sh];
  var vh = crypto.createHash("sha1").update(i.join('/')).digest('hex');

  var rq = { api      : 'snag.add'
           , djid     : this.currentDjId
           , songid   : this.currentSongId
           , roomid   : this.roomId
           , site     : 'queue'
           , location : 'board'
           , in_queue : 'false'
           , blocked  : 'false'
           , vh       : vh
           , sh       : sh
           , fh       : fh
           };
  this._send(rq, callback);
};


Bot.prototype.vote = function (val, callback) {
  var val      = arguments[0] || 'up'
    , callback = arguments[1] || null
    , vh       = crypto.createHash("sha1")
                       .update(this.roomId + val + this.currentSongId)
                       .digest('hex')
    , th       = crypto.createHash("sha1")
                       .update(Math.random().toString())
                       .digest('hex')
    , ph       = crypto.createHash("sha1")
                       .update(Math.random().toString())
                       .digest('hex')
    , rq       = { api: 'room.vote',
                   roomid: this.roomId,
                   val: val, vh: vh, th: th, ph: ph };
  this._send(rq, callback);
};


Bot.prototype.bop = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift('up');
  this.vote.apply(this, args);
};


Bot.prototype.userAuthenticate = function (callback) {
  var rq = { api: 'user.authenticate' };
  this._send(rq, callback);
};


Bot.prototype.userInfo = function (callback) {
  var rq = { api: 'user.info' };
  this._send(rq, callback);
};


Bot.prototype.userAvailableAvatars = function (callback) {
  var rq = { api: 'user.available_avatars' };
  this._send(rq, callback);
};


Bot.prototype.getAvatarIds = function(callback) {
  this.userInfo(function(userInfos) {
    var points = userInfos.points || -1;
    var acl = userInfos.acl || 0;
    this.userAvailableAvatars(function(avatars) {
      var res = [];
      for (var i = 0; i < avatars.avatars.length; i++) {
        var avatar = avatars.avatars[i];
        if (points >= avatar.min) {
          if (avatar.acl && acl < avatar.acl) {
            continue;
          }
          for (var j = 0; j < avatar.avatarids.length; j++) {
            var id = avatar.avatarids[j];
            if (res.indexOf(id) === -1) {
              res.push(id);
            }
          }
        }
      }
      callback({ ids: res, success: true });
    });
  });
};


Bot.prototype.getFanOf = function (callback) {
  var rq = { api: 'user.get_fan_of' };
  this._send(rq, callback);
};


Bot.prototype.getFans = function (callback) {
  var rq = { api: 'user.get_fans' };
  this._send(rq, callback);
};


Bot.prototype.getUserId = function(name, callback) {
  var rq = { api: 'user.get_id', name: name.toString() };
  this._send(rq, callback);
};


Bot.prototype.getProfile = function () {
  var rq       = { api: 'user.get_profile' };
  var callback = null;
  if (arguments.length == 1) {
    if (typeof arguments[0] === 'function') {
      callback = arguments[0];
    } else if (typeof arguments[0] === 'string') {
      rq.userid    = arguments[0];
    }
  } else if (arguments.length == 2) {
    rq.userid = arguments[0];
    callback  = arguments[1];
  }
  this._send(rq, callback);
};


Bot.prototype.modifyProfile = function (profile, callback) {
  var rq = { api: 'user.modify_profile' };
  if (profile.name)       { rq.name       = profile.name;       }
  if (profile.twitter)    { rq.twitter    = profile.twitter;    }
  if (profile.facebook)   { rq.facebook   = profile.facebook;   }
  if (profile.website)    { rq.website    = profile.website;    }
  if (profile.about)      { rq.about      = profile.about;      }
  if (profile.topartists) { rq.topartists = profile.topartists; }
  if (profile.hangout)    { rq.hangout    = profile.hangout;    }
  this._send(rq, callback);
};


Bot.prototype.modifyLaptop = function (laptop, callback) {
  laptop = laptop || 'linux';
  var rq = { api: 'user.modify', laptop: laptop };
  this._send(rq, callback);
};


Bot.prototype.modifyName = function (name, callback) {
  var rq = { api: 'user.modify', name: name };
  this._send(rq, callback);
};


Bot.prototype.setAvatar = function (avatarId, callback) {
  var rq = { api: 'user.set_avatar', avatarid: avatarId };
  this._send(rq, callback);
};


Bot.prototype.becomeFan = function (userId, callback) {
  var rq = { api: 'user.become_fan', djid: userId };
  this._send(rq, callback);
};


Bot.prototype.removeFan = function (userId, callback) {
  var rq = { api: 'user.remove_fan', djid: userId };
  this._send(rq, callback);
};


Bot.prototype.playlistAll = function () {
  var playlistName = 'default'
    , callback     = null;
  switch (arguments.length) {
    case 1:
      if (typeof arguments[0] == 'string') {
        playlistName = arguments[0];
      } else if (typeof arguments[0] == 'function') {
        callback     = arguments[0];
      }
      break
    case 2:
      playlistName = arguments[0];
      callback     = arguments[1];
      break;
  }
  var rq = { api: 'playlist.all', playlist_name: playlistName };
  this._send(rq, callback);
};


Bot.prototype.playlistAdd = function () {
  var playlistName = 'default'
    , songId       = null
    , index        = 0
    , callback     = null;
  switch (arguments.length) {
    case 1:
      songId       = arguments[0];
      break;
    case 2:
      if (typeof arguments[0] == 'string' &&
          typeof arguments[1] == 'string') {
        playlistName = arguments[0];
        songId       = arguments[1];
      } else if (typeof arguments[0] == 'string' &&
                 typeof arguments[1] == 'function') {
        songId       = arguments[0];
        callback     = arguments[1];
      } else if (typeof arguments[0] == 'string' &&
                 typeof arguments[1] == 'number') {
        songId       = arguments[0];
        index        = arguments[1];
      } else if (typeof arguments[0] == 'boolean' &&
                 typeof arguments[1] == 'string') {
        songId       = arguments[1];
      }
      break;
    case 3:
      if (typeof arguments[0] == 'string' &&
          typeof arguments[1] == 'string' &&
          typeof arguments[2] == 'number') {
        playlistName = arguments[0];
        songId       = arguments[1];
        index        = arguments[2];
      } else if (typeof arguments[0] == 'string' &&
                 typeof arguments[1] == 'string' &&
                 typeof arguments[2] == 'function') {
        playlistName = arguments[0];
        songId       = arguments[1];
        callback     = arguments[2];
      } else if (typeof arguments[0] == 'string' &&
                 typeof arguments[1] == 'number' &&
                 typeof arguments[2] == 'function') {
        songId       = arguments[0];
        index        = arguments[1];
        callback     = arguments[2];
      } else if (typeof arguments[0] == 'boolean' &&
                 typeof arguments[1] == 'string' &&
                 typeof arguments[2] == 'function') {
        songId       = arguments[1];
        callback     = arguments[2];
      }
      break;
    case 4:
      playlistName = arguments[0];
      songId       = arguments[1];
      index        = arguments[2];
      callback     = arguments[3];
      break;
  }
  var rq = { api: 'playlist.add',
             playlist_name: playlistName,
             song_dict: { fileid: songId },
             index: index };
  this._send(rq, callback);
};


Bot.prototype.playlistRemove = function () {
  var playlistName = 'default'
    , index        = 0
    , callback     = null;

  switch (arguments.length) {
    case 1:
      index = arguments[0];
      break;
    case 2:
      if (typeof arguments[0] == 'string' &&
          typeof arguments[1] == 'number') {
        playlistName = arguments[0];
        index        = arguments[1];
      } else if (typeof arguments[0] == 'number' &&
                 typeof arguments[1] == 'function') {
        index        = arguments[0];
        callback     = arguments[1];
      }
      break;
    case 3:
      playlistName = arguments[0];
      index        = arguments[1];
      callback     = arguments[2];
      break;
  }
  var rq = { api: 'playlist.remove',
             playlist_name: playlistName,
             index: index };
  this._send(rq, callback);
};


Bot.prototype.playlistReorder = function () {
  var playlistName = 'default'
    , indexFrom    = 0
    , indexTo      = 0
    , callback     = null;
  switch (arguments.length) {
    case 2:
      indexFrom = arguments[0];
      indexTo   = arguments[1];
      break;
    case 3:
       if (typeof arguments[0] == 'string' &&
           typeof arguments[1] == 'number' &&
           typeof arguments[2] == 'number') {
         playlistName = arguments[0];
         indexFrom    = arguments[1];
         indexTo      = arguments[2];
       } else if (typeof arguments[0] == 'number' &&
                  typeof arguments[1] == 'number' &&
                  typeof arguments[2] == 'function') {
         indexFrom    = arguments[0];
         indexTo      = arguments[1];
         callback     = arguments[2];
       }
       break;
    case 4:
      playlistName = arguments[0];
      indexFrom    = arguments[1];
      indexTo      = arguments[2];
      callback     = arguments[3];
      break;
  }
  var rq = { api: 'playlist.reorder',
             playlist_name: playlistName,
             index_from: indexFrom,
             index_to: indexTo };
  this._send(rq, callback);
};


Bot.prototype.setStatus = function(st, callback) {
  this.currentStatus = st;
  this.updatePresence();
  if (callback) {
    callback({ success: true });
  }
};


Bot.prototype.searchSong = function (q, callback) {
  var rq = { api: 'file.search', query: q };
  this._send(rq, callback);
};


Bot.prototype.getStickers = function(callback) {
  var rq = { api: 'sticker.get' };
  this._send(rq, callback);
};


Bot.prototype.getStickerPlacements = function(userid, callback) {
  var rq = { api: 'sticker.get_placements', userid: userid };
  this._send(rq, callback);
};


Bot.prototype.placeStickers = function (placements, callback) {
  var rq = { api: 'sticker.place',
             placements: placements,
             is_dj: true,
             roomid: this.roomId };
  this._send(rq, callback);
};


exports.Bot = Bot;
