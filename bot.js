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
   var self              = this;
   this.auth             = arguments[0];
   this.userId           = arguments[1];
   if (arguments.length == 3) {
      this.roomId        = arguments[2];
   } else {
      this.roomId        = null;
   }
   this.debug            = false;
   this.stdout           = 'stdout';
   this.callback         = function () {};
   this.currentDjId      = null;
   this.currentSongId    = null;
   this.lastHeartbeat    = new Date();
   this.lastActivity     = new Date();
   this.clientId         = new Date().getTime() + '-0.59633534294921572';
   this._msgId           = 0;
   this._cmds            = [];
   this._isConnected     = false;
   this.fanOf            = [];
   this.currentStatus    = 'available';
   this.CHATSERVER_ADDRS = [["chat2.turntable.fm", 80], ["chat3.turntable.fm", 80]];

   var infos = this.getHashedAddr(this.roomId ? this.roomId : Math.random().toString());
   var url = 'ws://'+infos[0]+':'+infos[1]+'/socket.io/websocket';

   this.ws = new WebSocket(url);
   this.ws.onmessage = function (msg) { self.onMessage(msg); };
   this.ws.onclose = function () { self.onClose(); };
   if (this.roomId) {
      // TODO: Should not be here... see the other todo (in roomRegister)
      this.callback = function () {
         var rq = { api: 'room.register', roomid: self.roomId };
         self._send(rq, null);
      };
   }
};

Bot.prototype.__proto__ = events.prototype;


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
                    success : true
                  };
};


Bot.prototype.onClose = function () {
   console.log('THIS IS WEIRD AND SHOULD NOT APPEAR.');
};


Bot.prototype.onMessage = function (msg) {
   var self = this;
   var data = msg.data;

   var heartbeat_rgx = /~m~[0-9]+~m~(~h~[0-9]+)/;
   if (data.match(heartbeat_rgx)) {
      self._heartbeat(data.match(heartbeat_rgx)[1]);
      self.lastHeartbeat = new Date();
      self.updatePresence();
      return;
   }

   if (this.debug) {
      if (this.stdout == 'stderr') { console.error('> ' + data); }
      else                         { console.log('> ' + data);   }
   }

   if (msg.data == '~m~10~m~no_session') {
      self.userAuthenticate(function () {
         if (!self._isConnected) {
            self.getFanOf(function (data) {
               self.fanOf = data.fanof;
               self.updatePresence();
               setInterval(function () { self.updatePresence(); }, 10000); // TODO: I don't like setInterval !
               self.emit('ready');
            });
         }
         self.callback();
         self._isConnected = true;
      });
      return;
   }

   this.lastActivity = new Date();

   var len_rgx = /~m~([0-9]+)~m~/;
   var len = data.match(len_rgx)[1];
   var json = JSON.parse(data.substr(data.indexOf('{'), len));
   for (var i=0; i<self._cmds.length; i++) {
      var id  = self._cmds[i][0];
      var rq  = self._cmds[i][1];
      var clb = self._cmds[i][2];
      if (id == json.msgid) {
         switch (rq.api) {
            case 'room.info':
               if (json.success === true) {
                  var currentDj   = json.room.metadata.current_dj;
                  var currentSong = json.room.metadata.current_song;
                  if (currentDj) {
                     self.currentDjId = currentDj;
                  }
                  if (currentSong) {
                     self.currentSongId = currentSong._id;
                  }
               }
               break;
            case 'room.register':
               if (json.success === true) {
                  self.roomId = rq.roomid;
                  self.roomInfo(function (data) {
                     self.setTmpSong(data);
                     self.emit('roomChanged', data);
                  });
               } else {
                  self.emit('roomChanged', json);
               }
               clb = null;
               break;
            case 'room.deregister':
               if (json.success === true) {
                  self.roomId = null;
               }
               break;
         }

         if (clb) {
            clb(json);
         }

         self._cmds.splice(i, 1);
         break;
      }
   }

   switch(json['command']) {
      case 'registered':
         self.emit('registered', json);
         break;
      case 'deregistered':
         self.emit('deregistered', json);
         break;
      case 'speak':
         self.emit('speak', json);
         break;
      case 'pmmed':
         self.emit('pmmed', json);
         break;
      case 'nosong':
         self.currentDjId   = null;
         self.currentSongId = null;
         self.emit('endsong', self.tmpSong);
         self.emit('nosong', json);
         break;
      case 'newsong':
         if (self.currentSongId) {
            self.emit('endsong', self.tmpSong);
         }
         self.currentDjId   = json.room.metadata.current_dj;
         self.currentSongId = json.room.metadata.current_song._id;
         self.setTmpSong(json);
         self.emit('newsong', json);
         break;
      case 'update_votes':
         if (self.tmpSong) {
            self.tmpSong.room.metadata.upvotes = json.room.metadata.upvotes;
            self.tmpSong.room.metadata.downvotes = json.room.metadata.downvotes;
            self.tmpSong.room.metadata.listeners = json.room.metadata.listeners;
         }
         self.emit('update_votes', json);
         break;
      case 'booted_user':
         self.emit('booted_user', json);
         break;
      case 'update_user':
         self.emit('update_user', json);
         break;
      case 'add_dj':
         self.emit('add_dj', json);
         break;
      case 'rem_dj':
         self.emit('rem_dj', json);
         break;
      case 'new_moderator':
         self.emit('new_moderator', json);
         break;
      case 'rem_moderator':
         self.emit('rem_moderator', json);
         break;
      case 'snagged':
         self.emit('snagged', json);
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
   this._msgId++;
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
}

Bot.prototype.hashMod = function (a, b) {
   var d = crypto.createHash("sha1").update(a).digest('hex');
   var c = 0;
   for (var i=0; i<d.length; i++) {
      c += d.charCodeAt(i);
   }
   return c % b;
};

Bot.prototype.getHashedAddr = function (a) {
   return this.CHATSERVER_ADDRS[this.hashMod(a, this.CHATSERVER_ADDRS.length)];
},

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

   function getGraph() {
      self.directoryGraph(function (directoryGraphData) {
         if (!directoryGraphData.success) {
            return callback(directoryGraphData);
         }
         for (var i=0; i<directoryGraphData.rooms.length; i++) {
            var room  = directoryGraphData.rooms[i][0];
            var users = directoryGraphData.rooms[i][1];
            for (var j=0; j<users.length; j++) {
               var user = users[j];
               if (user.userid == userId) {
                  if (allInfos) {
                     return callback({ roomId: room.roomid, room: room, user: user, success: true });
                  } else {
                     return callback({ roomId: room.roomid, success: true });
                  }
               }
            }
         }
         return callback({ err: 'userId not found.', success: false });
      });
   }

   if (self.fanOf.indexOf(userId) != -1) {
      getGraph();
   } else {
      self.becomeFan(userId, function (becomeFanData) {
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
   var self = this;
   var infos = this.getHashedAddr(roomId);
   var url = 'ws://'+infos[0]+':'+infos[1]+'/socket.io/websocket';
   this.ws.onclose = function () {};
   this.ws.close();
   this.callback = function () {
      var rq = { api: 'room.register', roomid: roomId };
      self._send(rq, callback);
   };
   // TODO: This should not be here at all...
   this.ws = new WebSocket(url);
   this.ws.onmessage = function (msg) { self.onMessage(msg); };
   this.ws.onclose = function () { self.onClose(); };
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
   var rq = { api: 'room.boot_user', roomid: this.roomId, target_userid: userId, reason: reason };
   this._send(rq, callback);
};

Bot.prototype.boot = function () {
   this.bootUser.apply(this, arguments);
};

Bot.prototype.addModerator = function (userId, callback) {
   var rq = { api: 'room.add_moderator', roomid: this.roomId, target_userid: userId };
   this._send(rq, callback);
};

Bot.prototype.remModerator = function (userId, callback) {
   var rq = { api: 'room.rem_moderator', roomid: this.roomId, target_userid: userId };
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
   var sh = crypto.createHash("sha1").update(Math.random().toString()).digest('hex');
   var fh = crypto.createHash("sha1").update(Math.random().toString()).digest('hex');

   var i  = [ this.userId, this.currentDjId, this.currentSongId, this.roomId, 'queue', 'board', 'false', sh ];
   var vh = crypto.createHash("sha1").update(i.join('/')).digest('hex');

   var rq = { api      : 'snag.add'
            , djid     : this.currentDjId
            , songid   : this.currentSongId
            , roomid   : this.roomId
            , site     : 'queue'
            , location : 'board'
            , in_queue : 'false'
            , vh       : vh
            , sh       : sh
            , fh       : fh
            };
   this._send(rq, callback);
};

Bot.prototype.vote = function (val, callback) {
   var val      = arguments[0] || 'up'
     , callback = arguments[1] || null
     , vh       = crypto.createHash("sha1").update(this.roomId + val + this.currentSongId).digest('hex')
     , th       = crypto.createHash("sha1").update(Math.random().toString()).digest('hex')
     , ph       = crypto.createHash("sha1").update(Math.random().toString()).digest('hex')
     , rq       = { api: 'room.vote', roomid: this.roomId, val: val, vh: vh, th: th, ph: ph };
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

Bot.prototype.getFanOf = function (callback) {
   var rq = { api: 'user.get_fan_of' };
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
         if      (typeof arguments[0] == 'string'  ) { playlistName = arguments[0]; }
         else if (typeof arguments[0] == 'function') { callback     = arguments[0]; }
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
         if (typeof arguments[0] == 'string' && typeof arguments[1] == 'string') {
            playlistName = arguments[0];
            songId       = arguments[1];
         } else if (typeof arguments[0] == 'string' && typeof arguments[1] == 'function') {
            songId       = arguments[0];
            callback     = arguments[1];
         } else if (typeof arguments[0] == 'string' && typeof arguments[1] == 'number') {
            songId       = arguments[0];
            index        = arguments[1];
         } else if (typeof arguments[0] == 'boolean' && typeof arguments[1] == 'string') {
            songId       = arguments[1];
         }
         break;
      case 3:
         if (typeof arguments[0] == 'string' && typeof arguments[1] == 'string' && typeof arguments[2] == 'number') {
            playlistName = arguments[0];
            songId       = arguments[1];
            index        = arguments[2];
         } else if (typeof arguments[0] == 'string' && typeof arguments[1] == 'string' && typeof arguments[2] == 'function') {
            playlistName = arguments[0];
            songId       = arguments[1];
            callback     = arguments[2];
         } else if (typeof arguments[0] == 'string' && typeof arguments[1] == 'number' && typeof arguments[2] == 'function') {
            songId       = arguments[0];
            index        = arguments[1];
            callback     = arguments[2];
         } else if (typeof arguments[0] == 'boolean' && typeof arguments[1] == 'string' && typeof arguments[2] == 'function') {
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
   var rq = { api: 'playlist.add', playlist_name: playlistName, song_dict: { fileid: songId }, index: index };
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
         if (typeof arguments[0] == 'string' && typeof arguments[1] == 'number') {
            playlistName = arguments[0];
            index        = arguments[1];
         } else if (typeof arguments[0] == 'number' && typeof arguments[1] == 'function') {
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
   var rq = { api: 'playlist.remove', playlist_name: playlistName, index: index };
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
         if (typeof arguments[0] == 'string' && typeof arguments[1] == 'number' && typeof arguments[2] == 'number') {
            playlistName = arguments[0];
            indexFrom    = arguments[1];
            indexTo      = arguments[2];
         } else if (typeof arguments[0] == 'number' && typeof arguments[1] == 'number' && typeof arguments[2] == 'function') {
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
   var rq = { api: 'playlist.reorder', playlist_name: playlistName, index_from: indexFrom, index_to: indexTo };
   this._send(rq, callback);
};

Bot.prototype.setStatus = function(st, callback) {
   this.currentStatus = st;
   this.updatePresence();
   if (callback) {
      callback({ success: true });
   }
};

exports.Bot = Bot;
