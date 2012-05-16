# -*- Coding: utf-8 -*-

import websocket
import urllib2
import time
import hashlib
import random
import re
import json
import logging

logger = logging.getLogger("turntable-api")

class Bot:
   def __init__(self, auth, user_id, room_id):
      self.auth             = auth
      self.userId           = user_id
      self.roomId           = room_id
      self.debug            = False
      self.callback         = None
      self.currentDjId      = None
      self.currentSongId    = None
      self.lastHeartbeat    = time.time()
      self.lastActivity     = time.time()
      self.clientId         = '%s-0.59633534294921572' % time.time()
      self._msgId           = 0
      self._cmds            = []
      self._isConnected     = False
      self.fanOf            = set()
      self.currentStatus    = 'available'
      self.signals = {}

      self.connect(self.roomId)


   def connect(self, roomId):
      def clb(host, port):
         url = 'ws://%s:%s/socket.io/websocket' % (host, port)
         # TODO: Check the encoding...
         url = url.decode('iso-8859-1').encode('utf8')
         self.ws = websocket.WebSocketApp(url, on_message=self.on_message)
         if self.roomId:
            def clb1():
               rq = { 'api': 'room.register', 'roomid': self.roomId }
               self._send(rq, None)
            self.callback = clb1

      self.whichServer(roomId, clb)


   def setTmpSong(self, data):
      self.tmpSong = { 'command': 'endsong', 'room': data.get('room'), 'success': True }


   def on_message(self, ws, msg):
      heartbeat_rgx = '~m~[0-9]+~m~(~h~[0-9]+)'
      if re.match(heartbeat_rgx, msg):
         self._heartbeat(re.match(heartbeat_rgx, msg).group(1))
         self.last_heartbeat = time.time()
         self.updatePresence(None)
         return

      if self.debug:
         logger.debug(msg);

      if msg == '~m~10~m~no_session':
         def auth_clb(obj):
            if not self._isConnected:
               def fanof(data):
                  self.fanOf |= set(data['fanof'])
                  self.updatePresence()
                  # TODO: setInterval ????
                  self.emit('ready')
               self.getFanOf(fanof)
            self.callback()
            self._isConnected = True
         self.userAuthenticate(auth_clb)
         return

      self.lastActivity = time.time()
      len_rgx = '~m~([0-9]+)~m~'
      len = re.match(len_rgx, msg).group(1)
      obj = json.loads(msg[msg.index('{'):])
      for id, rq, clb in self._cmds:
         if id == obj.get('msgid'):
            if rq['api'] == 'room.info':
               if obj['success']:
                  currentDj = obj['room']['metadata']['current_dj']
                  currentSong = obj['room']['metadata']['current_song']
                  if currentDj:   self.currentDj     = currentDj
                  if currentSong: self.currentSongId = currentSong.get('_id')

            elif rq['api'] == 'room.register':
               if obj['success']:
                  self.roomId = rq['roomid']
                  def info_clb(data):
                     self.setTmpSong(data)
                     self.emit('roomChanged', data)
                  self.roomInfo(info_clb)
               else:
                  self.emit('roomChanged', obj)
               clb = None

            elif rq['api'] == 'room.deregister':
               if obj['success']:
                  self.roomId = None

            if clb: clb(obj)

            self._cmds.remove([id, rq, clb])
            break

      if obj.get('command') == 'registered':
         self.emit('registered', obj)
      elif obj.get('command') == 'deregistered':
         self.emit('deregistered', obj)
      elif obj.get('command') == 'speak':
         self.emit('speak', obj)
      elif obj.get('command') == 'pmmed':
         self.emit('pmmed', obj)
      elif obj.get('command') == 'nosong':
         self.currentDjId   = None
         self.currentSongId = None
         self.emit('endsong', self.tmpSong)
         self.emit('nosong', obj)
      elif obj.get('command') == 'newsong':
         if self.currentSongId:
            self.emit('endsong', self.tmpSong)
         self.currentDjId   = obj['room']['metadata']['current_dj']
         self.currentSongId = obj['room']['metadata']['current_song']['_id']
         self.setTmpSong(obj)
         self.emit('newsong', obj)
      elif obj.get('command') == 'update_votes':
         if self.tmpSong:
            self.tmpSong['room']['metadata']['upvotes']   = obj['room']['metadata']['upvotes']
            self.tmpSong['room']['metadata']['downvotes'] = obj['room']['metadata']['downvotes']
            self.tmpSong['room']['metadata']['listeners'] = obj['room']['metadata']['listeners']
         self.emit('update_votes', obj)
      elif obj.get('command') == 'booted_user':
         self.emit('booted_user', obj)
      elif obj.get('command') == 'update_user':
         self.emit('update_user', obj)
      elif obj.get('command') == 'add_dj':
         self.emit('add_dj', obj)
      elif obj.get('command') == 'rem_dj':
         self.emit('rem_dj', obj)
      elif obj.get('command') == 'new_moderator':
         self.emit('new_moderator', obj)
      elif obj.get('command') == 'rem_moderator':
         self.emit('rem_moderator', obj)
      elif obj.get('command') == 'snagged':
         self.emit('snagged', obj)


   def _heartbeat(self, msg):
      self.ws.send('~m~%s~m~%s' % (len(msg), msg))
      self._msgId += 1


   def _send(self, rq, callback=None):
      rq['msgid']    = self._msgId
      rq['clientid'] = self.clientId
      rq['userid']   = rq.get('userid') or self.userId
      rq['userauth'] = self.auth

      msg = json.dumps(rq)

      if self.debug:
         logger.debug(msg);

      self.ws.send('~m~%s~m~%s' % (len(msg), msg))
      self._cmds.append([self._msgId, rq, callback])
      self._msgId += 1


   def whichServer(self, roomId, callback):
      dataStr = urllib2.urlopen('http://turntable.fm:80/api/room.which_chatserver?roomid=%s' % roomId).read()
      data = json.loads(dataStr)
      if data[0]:
         callback(data[1]['chatserver'][0], data[1]['chatserver'][1])
      else:
         if self.debug:
            logger.debug(msg);


   def roomNow(self, callback=None):
      rq = { 'api': 'room.now' }
      self._send(rq, callback)


   def updatePresence(self, callback=None):
      rq = { 'api': 'presence.update', 'status': self.currentStatus }
      self._send(rq, callback)


   def listRooms(self, skip=None, callback=None):
      skip = skip if skip else 0
      rq = { 'api': 'room.list_rooms', 'skip': skip }
      self._send(rq, callback)


   def directoryGraph(self, callback=None):
      rq = { 'api': 'room.directory_graph' }
      self._send(rq, callback)


   def stalk(self, *args):
      userId = ''
      allInfos = False
      callback = None

      if len(args) == 2:
         userId = args[0]
         callback = args[1]
      elif len(args) == 3:
         userId = args[0]
         allInfos = args[1]
         callback = args[2]

      def getGraph():
         def directory(data):
            if not data.get('success'):
               return callback(data)
            for room, users in data.get('rooms'):
               for user in users:
                  if user.get('userid') == userId:
                     if allInfos:
                        return callback({ 'roomId': room.get('roomid'), 'room': room, 'user': user, 'success': True })
                     else:
                        return callback({ 'roomId': room.get('roomid'), 'success': True })
         self.directoryGraph(directory)

      if userId in self.fanOf:
         getGraph()
      else:
         def fan(data):
            if not data.get('success'):
               if data.get('err') != 'User is already a fan':
                  return callback(data)
            getGraph()
         self.becomeFan(userId, fan)


   def getFavorites(self, callback=None):
      rq = { 'api': 'room.get_favorites' }
      self._send(rq, callback)


   def addFavorite(self, roomId, callback=None):
      rq = { 'api': 'room.add_favorite', 'roomid': roomId }
      self._send(rq, callback)


   def remFavorite(self, roomId, callback=None):
      rq = { 'api': 'room.rem_favorite', 'roomid': roomId }
      self._send(rq, callback)


   def roomRegister(self):
      pass


   def roomDeregister(self, callback=None):
      rq = { 'api': 'room.deregister', 'roomid': self.roomId }
      self._send(rq, callback)


   def roomInfo(self, *args):
      rq = { 'api': 'room.info', 'roomid': self.roomId }
      callback = None
      if len(args) == 1:
         if callable(args[0]):
            callback = args[0]
         elif isinstance(args[0], bool):
            rq['extended'] = args[0]
      elif len(args) == 2:
         rq['extended'] = args[0]
         callback       = args[1]
      self._send(rq, callback);


   def speak(self, msg, callback=None):
      rq = { 'api': 'room.speak', 'roomid': self.roomId, 'text': str(msg) }
      self._send(rq, callback)


   def pm(self, msg, userid, callback=None):
      rq = { 'api': 'pm.send', 'receiverid': userid, 'text': str(msg) }
      self._send(rq, callback)


   def pmHistory(self, userid, callback=None):
      rq = { 'api': 'pm.history', 'receiverid': userid }
      self._send(rq, callback)


   def bootUser(self, userId, reason='', callback=None):
      rq = { 'api': 'room.boot_user', 'roomid': self.roomId, 'target_userid': userId, 'reason': reason }
      self._send(rq, callback)


   def boot(self, userId, reason='', callback=None):
      self.bootUser(userId, reason, callback)


   def addModerator(self, userId, callback=None):
      rq = { 'api': 'room.add_moderator', 'roomid': self.roomId, 'target_userid': userId }
      self._send(rq, callback)


   def remModerator(self, userId, callback=None):
      rq = { 'api': 'room.rem_moderator', 'roomid': self.roomId, 'target_userid': userId }
      self._send(rq, callback)


   def addDj(self, callback=None):
      rq = { 'api': 'room.add_dj', 'roomid': self.roomId }
      self._send(rq, callback)


   def remDj(self, *args):
      djId = None
      callback = None
      if len(args) == 1:
         if callable(args[0]):
            djId = None
            callback = args[0]
         elif isinstance(args[0], str):
            djId = args[0]
            callback = None
      elif len(args) == 2:
         djId = args[0]
         callback = args[1]
      rq = { 'api': 'room.rem_dj', 'roomid': self.roomId }
      if djId: rq['djid'] = djId
      self._send(rq, callback)


   def stopSong(self, callback=None):
      rq = { 'api': 'room.stop_song', 'roomid': self.roomId }
      self._send(rq, callback)


   def skip(self):
      self.stopSong()


   def snag(self, callback=None):
      sh = hashlib.sha1(str(random.random())).hexdigest()
      fh = hashlib.sha1(str(random.random())).hexdigest()

      i  = [ self.userId, self.currentDjId, self.currentSongId, self.roomId, 'queue', 'board', 'false', sh ]
      vh = hashlib.sha1('/'.join(i)).hexdigest()

      rq = { 'api'      : 'snag.add'
           , 'djid'     : self.currentDjId
           , 'songid'   : self.currentSongId
           , 'roomid'   : self.roomId
           , 'site'     : 'queue'
           , 'location' : 'board'
           , 'in_queue' : 'false'
           , 'vh'       : vh
           , 'sh'       : sh
           , 'fh'       : fh
           }
      self._send(rq, callback)


   def vote(self, val='up', callback=None):
      vh = hashlib.sha1(self.roomId + val + self.currentSongId).hexdigest()
      th = hashlib.sha1(str(random.random())).hexdigest()
      ph = hashlib.sha1(str(random.random())).hexdigest()
      rq = { 'api': 'room.vote', 'roomid': self.roomId, 'val': val, 'vh': vh, 'th': th, 'ph': ph }
      self._send(rq, callback)


   def bop(self, callback=None):
      self.vote('up', callback)


   def userAuthenticate(self, callback):
      rq = { 'api': 'user.authenticate' }
      self._send(rq, callback)


   def userInfo(self, callback=None):
      rq = { 'api': 'user.info' }
      self._send(rq, callback)


   def getFanOf(self, callback=None):
      rq = { 'api': 'user.get_fan_of' }
      self._send(rq, callback)


   def getFans(self, callback=None):
      rq = { 'api': 'user.get_fans' }
      self._send(rq, callback)


   def getUserId(self, name, callback=None):
      rq = { 'api': 'user.get_id', 'name': str(name) }
      self._send(rq, callback)


   def getProfile(self, *args):
      rq       = { 'api': 'user.get_profile' }
      callback = None
      if len(args) == 1:
         if callable(args[0]):
            callback = args[0]
         elif isinstance(args[0], str):
            rq['userid'] = args[0]
      elif len(args) == 2:
         rq['userid'] = args[0]
         callback     = args[1]
      self._send(rq, callback)


   def modifyProfile(self, profile, callback=None):
      rq = { 'api': 'user.modify_profile' }
      if profile.get('name'):       rq['name']       = profile['name']
      if profile.get('twitter'):    rq['twitter']    = profile['twitter']
      if profile.get('facebook'):   rq['facebook']   = profile['facebook']
      if profile.get('website'):    rq['website']    = profile['website']
      if profile.get('about'):      rq['about']      = profile['about']
      if profile.get('topartists'): rq['topartists'] = profile['topartists']
      if profile.get('hangout'):    rq['hangout']    = profile['hangout']
      self._send(rq, callback)


   def modifyLaptop(self, laptop='linux', callback=None):
      rq = { 'api': 'user.modify', 'laptop': laptop }
      self._send(rq, callback)


   def modifyName(self, name, callback=None):
      rq = { 'api': 'user.modify', 'name': name }
      self._send(rq, callback)


   def setAvatar(self, avatarId, callback=None):
      rq = { 'api': 'user.set_avatar', 'avatarid': avatarId }
      self._send(rq, callback)


   def becomeFan(self, userId, callback=None):
      rq = { 'api': 'user.become_fan', 'djid': userId }
      self._send(rq, callback)


   def removeFan(self, userId, callback=None):
      rq = { 'api': 'user.remove_fan', 'djid': userId }
      self._send(rq, callback)


   def playlistAll(self, *args):
      playlistName = 'default'
      callback = None
      if len(args) == 1:
         if isinstance(args[0], str): playlistName = args[0]
         if callable(args[0]):        callback     = args[0]
      elif len(args) == 2:
         playlistName = args[0]
         callback     = args[1]
      rq = { 'api': 'playlist.all', 'playlist_name': playlistName }
      self._send(rq, callback)


   def playlistAdd(self, *args):
      playlistName = 'default'
      songId       = None
      index        = 0
      callback     = None
      if len(args) == 1:
         songId = args[0]
      elif len(args) == 2:
         if isinstance(args[0], str) and isinstance(args[1], str):
            playlistName = args[0]
            songId       = args[1]
         elif isinstance(args[0], str) and callable(args[1]):
            songId   = args[0]
            callback = args[1]
         elif isinstance(args[0], str) and isinstance(args[1], int):
            songId = args[0]
            index  = args[1]
         elif isinstance(args[0], bool) and isinstance(args[1], str):
            songId = args[1]
      elif len(args) == 3:
         if isinstance(args[0], str) and isinstance(args[1], str) and isinstance(args[2], int):
            playlistName = args[0]
            songId       = args[1]
            index        = args[2]
         elif isinstance(args[0], str) and isinstance(args[1], str) and callable(args[2]):
            playlistName = args[0]
            songId       = args[1]
            callback     = args[2]
         elif isinstance(args[0], str) and isinstance(args[1], int) and callable(args[2]):
            songId   = args[0]
            index    = args[1]
            callback = args[2]
         elif isinstance(args[0], bool) and isinstance(args[1], str) and callable(args[2]):
            songId   = args[1]
            callback = args[2]
      elif len(args) == 4:
         playlistName = args[0]
         songId       = args[1]
         index        = args[2]
         callback     = args[3]
      rq = { 'api': 'playlist.add', 'playlist_name': playlistName, 'song_dict': { 'fileid': songId }, 'index': index }
      self._send(rq, callback)


   def playlistRemove(self, *args):
      playlistName = 'default'
      index        = 0
      callback     = None

      if len(args) == 1:
         index = args[0]
      elif len(args) == 2:
         if isinstance(args[0], str) and isinstance(args[1], int):
            playlistName = args[0]
            index        = args[1]
         elif isinstance(args[0], int) and callable(args[1]):
            index    = args[0]
            callback = args[1]
      elif len(args) == 3:
         playlistName = args[0]
         index        = args[1]
         callback     = args[2]
      rq = { 'api': 'playlist.remove', 'playlist_name': playlistName, 'index': index }
      self._send(rq, callback)


   def playlistReorder(self, *args):
      playlistName = 'default'
      indexFrom    = 0
      indexTo      = 0
      callback     = None
      if len(args) == 2:
         indexFrom = args[0]
         indexTo   = args[1]
      elif len(args) == 3:
         if isinstance(args[0], str) and isinstance(args[1], int) and isinstance(args[2], int):
            playlistName = args[0]
            indexFrom    = args[1]
            indexTo      = args[2]
         elif isinstance(args[0], int) and isinstance(args[1], int) and callable(args[2]):
            indexFrom = args[0]
            indexTo   = args[1]
            callback  = args[2]
      elif len(args) == 4:
         playlistName = args[0]
         indexFrom    = args[1]
         indexTo      = args[2]
         callback     = args[3]
      rq = { 'api': 'playlist.reorder', 'playlist_name': playlistName, 'index_from': indexFrom, 'index_to': indexTo }
      self._send(rq, callback)


   def getStickers(self, callback=None):
      rq = { 'api': 'sticker.get' }
      self._send(rq, callback)


   def getStickerPlacements(self, userid, callback=None):
      rq = { 'api': 'sticker.get_placements', 'userid': userid }
      self._send(rq, callback)


   def setStatus(self, st, callback=None):
      self.currentStatus = st
      self.updatePresence()
      if callback: callback({ 'success': True })


   def emit(self, signal, data=None):
      callbacks = self.signals.get(signal) or []
      for clb in callbacks:
         clb(data)


   def on(self, signal, callback):
      if not signal in self.signals:
         self.signals[signal] = []
      self.signals[signal].append(callback)


   def start(self):
      self.ws.run_forever()
