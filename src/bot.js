/*
 * decaffeinate suggestions:
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//#
// Copyright 2011,2012 Alain Gilbert <alain.gilbert.15@gmail.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.
//

const WebSocket = require('ws');
const { EventEmitter } = require('events');
const crypto = require('crypto');
const fetch = require('node-fetch')

class Bot extends EventEmitter {
  constructor(auth, userId, roomId=null) {
    super();

    this.apiUrl          = 'https://turntable.fm/';
    this.auth            = auth;
    this.userId          = userId;
    this.roomId          = roomId;
    this.debug           = false;
    this.stdout          = 'stdout';
    this.callback        = function() {};
    this.currentDjId     = null;
    this.currentSongId   = null;
    this.lastHeartbeat   = Date.now();
    this.lastActivity    = Date.now();
    this.clientId        = Date.now() + '-0.59633534294921572';
    this.disconnectInterval = 120000;
    this.presenceInterval = 10000;
    this._msgId          = 0;
    this._cmds           = [];
    this._intervalId     = null;
    this._isAuthenticated = false;
    this._isConnected    = false;
    this.fanOf           = [];
    this.currentStatus   = 'available';
    this.currentSearches = [];

    if (this.roomId) {
      this.callback = function() {
        const rq = {api: 'room.register', roomid: this.roomId};
        return this._send(rq, null);
      };
    }

    const randomHash = crypto.createHash("sha1")
                 .update(Math.random().toString())
                 .digest('hex').substr(0, 24);

    this.connect(this.roomId != null ? this.roomId : randomHash);
  }


  log() {
    const args = Array.prototype.slice.call(arguments);
    if (typeof this.debug === 'function') {
      return this.debug.apply(this, args);
    } else if (this.debug) {
      if (this.stdout === 'stderr') {
        return console.error.apply(this, args);
      } else {
        return console.log.apply(this, args);
      }
    }
  }


  disconnect(err) {
    this._isAuthenticated = false;
    this._isConnected = false;
    if (this.listeners('disconnected').length > 0) {
      return this.emit('disconnected', err);
    } else {
      return this.emit('error', err);
    }
  }


  connect(roomId) {
    if (!/^[0-9a-f]{24}$/.test(roomId)) {
      throw new Error(`Invalid roomId: cannot connect to '${roomId}'`);
    }
    return this.whichServer(roomId, (host, port) => {
      const url  = `wss://${host}:${port}/socket.io/websocket`;
      this.ws = new WebSocket(url);
      return this.ws.on('message', data => {
        return this.onMessage(data);
    }).on('wserror', e => {
        return this.disconnect(e);
      }).on('close', () => {
        return this.onClose();
      });
    });
  }


  whichServer(roomid, callback) {
    setImmediate(() => {
      callback('chat1.turntable.fm', 8080);
    });

    /*
    return fetch(`https://turntable.fm/api/room.which_chatserver/roomid=${roomid}`)
      .then((res) => res.json())
      .then((data) => {
        console.log(data)
        const [host, port] = data[1].chatserver;
        callback.call(this, host, port);
      })
      .catch((err) => {
        this.disconnect(err);
      });
    */
  }


  setTmpSong(data) {
    return this.tmpSong = {
      command : 'endsong',
      room : data.room,
      success : true
    };
  }


  onClose() {}
    //console.log 'THIS IS WEIRD AND SHOULD NOT APPEAR.'


  isHeartbeat(data) {
    const heartbeat_rgx = /~m~[0-9]+~m~(~h~[0-9]+)/;
    return data.match(heartbeat_rgx);
  }


  isNoSession(data) {
    return data === '~m~10~m~no_session';
  }


  treatHeartbeat(packet) {
    const heartbeat_rgx = /~m~[0-9]+~m~(~h~[0-9]+)/;
    this._heartbeat(packet.match(heartbeat_rgx)[1]);
    this.lastHeartbeat = Date.now();
    return this.updatePresence();
  }


  treatNoSession(packet) {
    return this.userAuthenticate(function() {
      this._isAuthenticated = true;
      if (!this._isConnected) {
        this.getFanOf(function(data) {
          this.fanOf = data.fanof;
          this.updatePresence();
          // TODO: I don't like setInterval !
          if (this._intervalId) {
            clearInterval(this._intervalId);
          }
          this._intervalId = setInterval(this.maintainPresence.bind(this), this.presenceInterval);
          return this.emit('ready');
        });
      }
      this.callback();
      return this._isConnected = true;
    });
  }


  maintainPresence() {
    let activity;
    if (this.lastHeartbeat > this.lastActivity) {
      activity = this.lastHeartbeat;
    } else {
      activity = this.lastActivity;
    }
    if (this._isConnected && ((Date.now() - activity) > this.disconnectInterval)) {
      this.log('No response from server; is there a proxy/firewall problem?');
      return this.disconnect(new Error('No response from server'));
    } else {
      return this.updatePresence();
    }
  }


  extractPacketJson(packet) {
    const len_rgx = /~m~([0-9]+)~m~/;
    const len = packet.match(len_rgx)[1];
    try {
      return JSON.parse(packet.substr(packet.indexOf('{'), len));
    } catch (err) {
      return null;
    }
  }


  executeCallback(json) {
    let index = 0;
    while (index < this._cmds.length) {
      let [id, rq, clb] = this._cmds[index];
      let is_search = false;

      if (id === json.msgid) {
        switch (rq.api) {
          case 'room.info':
            if (json.success === true) {
              const currentDj   = json.room.metadata.current_dj;
              const currentSong = json.room.metadata.current_song;
              if (currentDj) { this.currentDjId = currentDj; }
              if (currentSong) { this.currentSongId = currentSong._id; }
            }
            break;
          case 'room.register':
            if (json.success === true) {
              this.roomId = rq.roomid;
              (clb => {
                return this.roomInfo(function(data) {
                  this.setTmpSong(data);
                  this.emit('roomChanged', data);
                  return (clb != null ? clb.call(this, data) : undefined);});
              }
              )(clb);
            } else {
              this.emit('roomChanged', json);
              if (clb != null) {
                clb.call(this, json);
              }
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

        this._cmds.splice(index, 1);
        break;
      } else {
        index++;
      }
    }
  }


  treatCommand(json) {
    const command = json['command'];
    switch (command) {
      case 'nosong':
        this.currentDjId   = null;
        this.currentSongId = null;
        this.emit('endsong', this.tmpSong);
        break;
      case 'newsong':
        if (this.currentSongId) {
          this.emit('endsong', this.tmpSong);
        }
        this.currentDjId   = json.room.metadata.current_dj;
        this.currentSongId = json.room.metadata.current_song._id;
        this.setTmpSong(json);
        break;
      case 'update_votes':
        if (this.tmpSong) {
          this.tmpSong.room.metadata.upvotes = json.room.metadata.upvotes;
          this.tmpSong.room.metadata.downvotes = json.room.metadata.downvotes;
          this.tmpSong.room.metadata.listeners = json.room.metadata.listeners;
        }
        break;
      case 'rem_dj':
        if (json.modid) {
          this.emit('escort', json);
        }
        break;
      case 'search_complete':
        var query = json['query'];
        for (let i = 0, end = this.currentSearches.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
          if ((this.currentSearches[i].query === query) && this.currentSearches[i].callback) {
            this.currentSearches[i].callback(json);
            this.currentSearches.splice(i, 1);
            break;
          }
        }
        break;
    }
    return this.emit(command, json);
  }


  treatPacket(packet) {
    const json = this.extractPacketJson(packet);
    this.executeCallback(json);
    return this.treatCommand(json);
  }


  onMessage(data) {
    this.emit('alive');
    if (this.isHeartbeat(data)) { return this.treatHeartbeat(data); }
    this.log(`> ${data}`);
    if (this.isNoSession(data)) { return this.treatNoSession(data); }
    this.lastActivity = Date.now();
    return this.treatPacket(data);
  }


  _heartbeat(msg) {
    return this.ws.send(`~m~${msg.length}~m~${msg}`);
  }


  toString() { return ''; }


  _send(rq, callback) {
    rq.msgid    = this._msgId;
    rq.clientid = this.clientId;
    if (rq.userid == null) {  rq.userid = this.userId; }
    rq.userauth = this.auth;

    const msg = JSON.stringify(rq);

    this.log(`< ${msg}`);

    if (!this._isAuthenticated && (rq.api !== 'user.authenticate')) {
      this.log(`Bot is not ready. Can't send : '${rq.api}'`);
      return;
    }

    this.ws.send(`~m~${msg.length}~m~${msg}`);
    this._cmds.push([this._msgId, rq, callback]);
    return this._msgId++;
  }


  close() {
    return this.ws.close();
  }


  listen(port, address) {
    const http = require('http');
    const querystring = require('querystring');

    return http.createServer((req, res) => {
      let dataStr = '';
      req.on('data', chunk => {
        return dataStr += chunk.toString();
      });
      return req.on('end', () => {
        const data = querystring.parse(dataStr);
        req._POST = data;
        return this.emit('httpRequest', req, res);
    });
    }).listen(port, address);
  }


  tcpListen(port, address) {
    const net = require('net');

    return net.createServer(socket => {
      socket.on('connect', () => {
        return this.emit('tcpConnect', socket);
      });
      socket.on('data', data => {
        const msg = data.toString();
        if (msg[msg.length - 1] === '\n') {
          return this.emit('tcpMessage', socket, msg.substr(0, msg.length-1));
        }
      });
      return socket.on('end', function() {
        return this.emit('tcpEnd', socket);
    });
    }).listen(port, address);
  }


  roomNow(callback) {
    const rq = {api: 'room.now'};
    return this._send(rq, callback);
  }


  updatePresence(callback) {
    const rq = {api: 'presence.update', status: this.currentStatus};
    return this._send(rq, callback);
  }


  listRooms(skip, sectionAware, callback) {
    if (skip == null) { skip = 0; }
    // so we don't break code from previous revisions
    if ((typeof sectionAware === 'function') && (callback === undefined)) {
      callback = sectionAware;
      sectionAware = false;
    } else if (typeof sectionAware !== 'boolean') {
      sectionAware = false;
    }
    const rq = {api: 'room.list_rooms', skip, section_aware: sectionAware};
    return this._send(rq, callback);
  }


  searchRooms(options, callback) {
    if (typeof options !== 'object') {
      callback = options;
      options = {};
    }

    const rq = {api: 'room.search', limit: options.limit != null ? options.limit : 10};
    if (options.query) {
      rq.query = options.query;
    }
    return this._send(rq, callback);
  }


  directoryGraph(callback) {
    const rq = {api: 'room.directory_graph'};
    return this._send(rq, callback);
  }


  directoryRooms(options, callback) {
    if (typeof options !== 'object') {
      callback = options;
      options = {};
    }

    options.client = 'web';

    const url = new URL('/api/room.directory_rooms', this.apiUrl);
    url.search = new URLSearchParams(options);
    fetch(url).then((res) => res.json()).then(callback, (err) => {
      this.emit('error', err);
    });
  }


  stalk() {
    let userId   = '';
    let allInfos = false;
    let callback = function() {};

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

    const getGraph = () => {
      return this.directoryGraph(function(directoryGraphData) {
        if (!directoryGraphData.success) {
          return callback(directoryGraphData);
        }
        for (let graphObj of directoryGraphData.rooms) {
          const room = graphObj[0];
          const users = graphObj[1];
          for (let user of users) {
            if (user.userid === userId) {
              if (allInfos) {
                return callback({roomId: room.roomid, room},
                                {user, success: true});
              } else {
                return callback({roomId: room.roomid, success: true});
              }
            }
          }
        }
        return callback({err: 'userId not found.', success: false});});
    };

    if (this.fanOf.indexOf(userId) !== -1) {
      return getGraph();
    } else {
      return this.becomeFan(userId, function(becomeFanData) {
        if (!becomeFanData.success) {
          if (becomeFanData.err !== 'User is already a fan') {
            return callback(becomeFanData);
          }
        }
        return getGraph();
      });
    }
  }


  getFavorites(callback) {
    const rq = {api: 'room.get_favorites'};
    return this._send(rq, callback);
  }


  addFavorite(roomId, callback) {
    const rq = {api: 'room.add_favorite', roomid: roomId};
    return this._send(rq, callback);
  }


  remFavorite(roomId, callback) {
    const rq = {api: 'room.rem_favorite', roomid: roomId};
    return this._send(rq, callback);
  }


  roomVerify(roomId, callback) {
    const rq = {api: 'room.info', roomid: roomId};
    return this._send(rq, callback);
  }


  roomRegister(roomId, callback) {
    if (this.ws) {
      this.ws.removeAllListeners('message');
      this.ws.removeAllListeners('wserror');
      this.ws.removeAllListeners('close');
      this.ws.close();
    }
    this.callback = function() {
      const rq = {api: 'room.register', roomid: roomId};
      return this._send(rq, callback);
    };
    return this.connect(roomId);
  }


  roomDeregister(callback) {
    const rq = {api: 'room.deregister', roomid: this.roomId};
    return this._send(rq, callback);
  }


  roomInfo() {
    const rq = {api: 'room.info', roomid: this.roomId};
    let callback = null;
    if (arguments.length === 1) {
      if (typeof arguments[0] === 'function') {
        callback = arguments[0];
      } else if (arguments[0] === 'boolean') {
        rq.extended = arguments[0];
      }
    } else if (arguments.length === 2) {
      rq.extended = arguments[0];
      callback    = arguments[1];
    }
    return this._send(rq, callback);
  }


  speak(msg, callback) {
    const rq = {api: 'room.speak', roomid: this.roomId, text: msg.toString()};
    return this._send(rq, callback);
  }


  pm(msg, userid, callback) {
    const rq = {api: 'pm.send', receiverid: userid, text: msg.toString()};
    return this._send(rq, callback);
  }


  pmHistory(userid, callback) {
    const rq = {api: 'pm.history', receiverid: userid};
    return this._send(rq, callback);
  }


  bootUser(userId, reason, callback) {
    const rq = {
      api: 'room.boot_user',
      roomid: this.roomId,
      target_userid: userId,
      reason
    };
    return this._send(rq, callback);
  }


  boot() {
    return this.bootUser.apply(this, arguments);
  }


  addModerator(userId, callback) {
    const rq = {
      api: 'room.add_moderator',
      roomid: this.roomId,
      target_userid: userId
    };
    return this._send(rq, callback);
  }


  remModerator(userId, callback) {
    const rq = {
      api: 'room.rem_moderator',
      roomid: this.roomId,
      target_userid: userId
    };
    return this._send(rq, callback);
  }


  addDj(callback) {
    const rq = {api: 'room.add_dj', roomid: this.roomId};
    return this._send(rq, callback);
  }


  remDj() {
    let callback, djId;
    if (arguments.length === 1) {
      if (typeof arguments[0] === 'function') {
        djId     = null;
        callback = arguments[0];
      } else if (typeof arguments[0] === 'string') {
        djId     = arguments[0];
        callback = null;
      }
    } else if (arguments.length === 2) {
      djId     = arguments[0];
      callback = arguments[1];
    }
    const rq = {api: 'room.rem_dj', roomid: this.roomId};
    if (djId) {
      rq.djid = djId;
    }
    return this._send(rq, callback);
  }


  stopSong(callback) {
    const rq = {api: 'room.stop_song', roomid: this.roomId, current_song: this.currentSongId};
    return this._send(rq, callback);
  }


  skip() {
    return this.stopSong.apply(this, arguments);
  }


  snag(callback) {
    const sh = crypto.createHash("sha1")
               .update(Math.random().toString())
               .digest('hex');
    const fh = crypto.createHash("sha1")
               .update(Math.random().toString())
               .digest('hex');

    const i  = [this.userId, this.currentDjId, this.currentSongId, this.roomId,
          'queue', 'board', 'false', 'false', sh];
    const vh = crypto.createHash("sha1").update(i.join('/')).digest('hex');

    const rq = {
      api      : 'snag.add',
      djid     : this.currentDjId,
      songid   : this.currentSongId,
      roomid   : this.roomId,
      site     : 'queue',
      location : 'board',
      in_queue : 'false',
      blocked  : 'false',
      vh,
      sh,
      fh
    };

    return this._send(rq, callback);
  }


  vote(val, callback) {
    val      = arguments[0] != null ? arguments[0] : 'up';
    callback = arguments[1] != null ? arguments[1] : null;
    const vh       = crypto.createHash("sha1")
                     .update(this.roomId + val + this.currentSongId)
                     .digest('hex');
    const th       = crypto.createHash("sha1")
                     .update(Math.random().toString())
                     .digest('hex');
    const ph       = crypto.createHash("sha1")
                     .update(Math.random().toString())
                     .digest('hex');
    const rq = {
      api: 'room.vote',
      roomid: this.roomId,
      val, vh, th, ph
    };

    return this._send(rq, callback);
  }


  bop() {
    const args = Array.prototype.slice.call(arguments);
    args.unshift('up');
    return this.vote.apply(this, args);
  }


  userAuthenticate(callback) {
    const rq = {api: 'user.authenticate'};
    return this._send(rq, callback);
  }


  userInfo(callback) {
    const rq = {api: 'user.info'};
    return this._send(rq, callback);
  }


  userAvailableAvatars(callback) {
    const rq = {api: 'user.available_avatars'};
    return this._send(rq, callback);
  }


  getAvatarIds(callback) {
    return this.userInfo(function(userInfos) {
      const points = userInfos.points != null ? userInfos.points : -1;
      const acl = userInfos.acl != null ? userInfos.acl : 0;
      return this.userAvailableAvatars(function(avatars) {
        const res = [];
        for (let avatar of avatars.avatars) {
          if (points >= avatar.min) {
            if (avatar.acl && (acl < avatar.acl)) {
              continue;
            }
            for (let id of avatar.avatarids) {
              if (res.indexOf(id) === -1) {
                res.push(id);
              }
            }
          }
        }
        return callback({ids: res, success: true});});});
  }


  getFanOf() {
    const rq = {api: 'user.get_fan_of'};
    let callback = null;
    if (arguments.length === 1) {
      if (typeof arguments[0] === 'function') {
        callback = arguments[0];
      } else if (typeof arguments[0] === 'string') {
        rq.userid = arguments[0];
      }
    } else if (arguments.length === 2) {
      rq.userid = arguments[0];
      callback  = arguments[1];
    }
    return this._send(rq, callback);
  }


  getFans() {
    const rq = {api: 'user.get_fans'};
    let callback = null;
    if (arguments.length === 1) {
      if (typeof arguments[0] === 'function') {
        callback = arguments[0];
      } else if (typeof arguments[0] === 'string') {
        rq.userid = arguments[0];
      }
    } else if (arguments.length === 2) {
      rq.userid = arguments[0];
      callback  = arguments[1];
    }
    return this._send(rq, callback);
  }


  getUserId(name, callback) {
    const rq = {api: 'user.get_id', name: name.toString()};
    return this._send(rq, callback);
  }


  getPresence() {
    const rq = {api: 'presence.get'};
    let callback = null;
    if (arguments.length === 1) {
      if (typeof arguments[0] === 'function') {
        rq.uid = this.userId;
        callback = arguments[0];
      } else if (typeof arguments[0] === 'string') {
        rq.uid = arguments[0];
      }
    } else if (arguments.length === 2) {
      rq.uid = arguments[0];
      callback  = arguments[1];
    }
    return this._send(rq, callback);
  }


  getProfile() {
    const rq = {api: 'user.get_profile_info'};
    let callback = null;
    if (arguments.length === 1) {
      if (typeof arguments[0] === 'function') {
        rq.profileid = this.userId;
        callback = arguments[0];
      } else if (typeof arguments[0] === 'string') {
        rq.profileid = arguments[0];
      }
    } else if (arguments.length === 2) {
      rq.profileid = arguments[0];
      callback  = arguments[1];
    }
    return this._send(rq, callback);
  }


  modifyProfile(profile, callback) {
    const rq = {api: 'user.modify_profile'};
    if (profile.name) { rq.name       = profile.name; }
    if (profile.twitter) { rq.twitter    = profile.twitter; }
    if (profile.soundcloud) { rq.soundcloud = profile.soundcloud; }
    if (profile.facebook) { rq.facebook   = profile.facebook; }
    if (profile.website) { rq.website    = profile.website; }
    if (profile.about) { rq.about      = profile.about; }
    if (profile.topartists) { rq.topartists = profile.topartists; }
    if (profile.hangout) { rq.hangout    = profile.hangout; }
    return this._send(rq, callback);
  }


  modifyLaptop(laptop, callback) {
    laptop = laptop != null ? laptop : 'linux';
    const rq = {api: 'user.modify', laptop};
    return this._send(rq, callback);
  }


  modifyName(name, callback) {
    const rq = {api: 'user.modify', name};
    return this._send(rq, callback);
  }


  setAvatar(avatarId, callback) {
    const rq = {api: 'user.set_avatar', avatarid: avatarId};
    return this._send(rq, callback);
  }


  becomeFan(userId, callback) {
    const rq = {api: 'user.become_fan', djid: userId};
    return this._send(rq, callback);
  }


  removeFan(userId, callback) {
    const rq = {api: 'user.remove_fan', djid: userId};
    return this._send(rq, callback);
  }


  playlistListAll(callback) {
    const rq = {api: 'playlist.list_all'};
    return this._send(rq, callback);
  }


  playlistCreate(playlistName, callback) {
    const rq = {api: 'playlist.create', playlist_name: playlistName};
    return this._send(rq, callback);
  }


  playlistDelete(playlistName, callback) {
    const rq = {api: 'playlist.delete', playlist_name: playlistName};
    return this._send(rq, callback);
  }


  playlistRename(oldPlaylistName, newPlaylistName, callback) {
    const rq = {
      api: 'playlist.rename',
      old_playlist_name: oldPlaylistName,
      new_playlist_name: newPlaylistName
    };
    return this._send(rq, callback);
  }


  playlistSwitch(playlistName, callback) {
    const rq = {api: 'playlist.switch', playlist_name: playlistName};
    return this._send(rq, callback);
  }


  playlistNewBlockedSongCount(callback) {
    const rq = {api: 'playlist.new_blocked_song_count'};
    return this._send(rq, callback);
  }


  playlistAll() {
    let playlistName = 'default';
    let callback     = null;
    switch (arguments.length) {
      case 1:
        if (typeof arguments[0] === 'string') {
          playlistName = arguments[0];
        } else if (typeof arguments[0] === 'function') {
          callback     = arguments[0];
        }
        break;
      case 2:
        playlistName = arguments[0];
        callback     = arguments[1];
        break;
    }
    const rq = {api: 'playlist.all', playlist_name: playlistName};
    return this._send(rq, callback);
  }


  playlistAdd() {
    let playlistName = 'default';
    let songId       = null;
    let index        = 0;
    let callback     = null;
    switch (arguments.length) {
      case 1:
        songId = arguments[0];
        break;
      case 2:
        if ((typeof arguments[0] === 'string') &&
           (typeof arguments[1] === 'string')) {
          playlistName = arguments[0];
          songId       = arguments[1];
        } else if ((typeof arguments[0] === 'string') &&
                (typeof arguments[1] === 'function')) {
          songId       = arguments[0];
          callback     = arguments[1];
        } else if ((typeof arguments[0] === 'string') &&
                (typeof arguments[1] === 'number')) {
          songId       = arguments[0];
          index        = arguments[1];
        } else if ((typeof arguments[0] === 'boolean') &&
                (typeof arguments[1] === 'string')) {
          songId       = arguments[1];
        }
        break;
      case 3:
        if ((typeof arguments[0] === 'string') &&
           (typeof arguments[1] === 'string') &&
           (typeof arguments[2] === 'number')) {
          playlistName = arguments[0];
          songId       = arguments[1];
          index        = arguments[2];
        } else if ((typeof arguments[0] === 'string') &&
                (typeof arguments[1] === 'string') &&
                (typeof arguments[2] === 'function')) {
          playlistName = arguments[0];
          songId       = arguments[1];
          callback     = arguments[2];
        } else if ((typeof arguments[0] === 'string') &&
                (typeof arguments[1] === 'number') &&
                (typeof arguments[2] === 'function')) {
          songId       = arguments[0];
          index        = arguments[1];
          callback     = arguments[2];
        } else if ((typeof arguments[0] === 'boolean') &&
                (typeof arguments[1] === 'string') &&
                (typeof arguments[2] === 'function')) {
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
    const rq = {
      api: 'playlist.add',
      playlist_name: playlistName,
      song_dict: { fileid: songId },
      index
    };
    return this._send(rq, callback);
  }


  playlistRemove() {
    let playlistName = 'default';
    let index        = 0;
    let callback     = null;

    switch (arguments.length) {
      case 1:
        index = arguments[0];
        break;
      case 2:
        if ((typeof arguments[0] === 'string') &&
           (typeof arguments[1] === 'number')) {
          playlistName = arguments[0];
          index        = arguments[1];
        } else if ((typeof arguments[0] === 'number') &&
                (typeof arguments[1] === 'function')) {
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
    const rq = {
      api: 'playlist.remove',
      playlist_name: playlistName,
      index
    };
    return this._send(rq, callback);
  }


  playlistReorder() {
    let playlistName = 'default';
    let indexFrom    = 0;
    let indexTo      = 0;
    let callback     = null;
    switch (arguments.length) {
      case 2:
        indexFrom = arguments[0];
        indexTo   = arguments[1];
        break;
      case 3:
        if ((typeof arguments[0] === 'string') &&
           (typeof arguments[1] === 'number') &&
           (typeof arguments[2] === 'number')) {
          playlistName = arguments[0];
          indexFrom    = arguments[1];
          indexTo      = arguments[2];
        } else if ((typeof arguments[0] === 'number') &&
                 (typeof arguments[1] === 'number') &&
                 (typeof arguments[2] === 'function')) {
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
    const rq = {
       api: 'playlist.reorder',
       playlist_name: playlistName,
       index_from: indexFrom,
       index_to: indexTo
     };
    return this._send(rq, callback);
  }


  setStatus(status, callback) {
    this.currentStatus = status;
    this.updatePresence();
    if (callback) {
      return callback({ success: true });
    }
  }


  searchSong(query, callback) {
    const rq = {api: 'file.search', query};
    return this._send(rq, callback);
  }


  getStickers(callback) {
    const rq = {api: 'sticker.get'};
    return this._send(rq, callback);
  }


  getStickerPlacements(userid, callback) {
    const rq = {api: 'sticker.get_placements', userid};
    return this._send(rq, callback);
  }


  placeStickers(placements, callback) {
    const rq = {
      api: 'sticker.place',
      placements,
      is_dj: true,
      roomid: this.roomId
    };
    return this._send(rq, callback);
  }
}

exports.Bot = Bot;
