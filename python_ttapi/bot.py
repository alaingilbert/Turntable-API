import websocket
import time
import hashlib
import random
import re
import json


class Bot:
   def __init__(self, auth, user_id, room_id):
      self.auth             = auth
      self.userId           = user_id
      self.roomId           = room_id
      self.debug            = False
      self.stdout           = 'stdout'
      self.callback         = None
      self.currentDjId      = None
      self.currentSongId    = None
      self.lastHeartbeat    = time.time()
      self.lastActivity     = time.time()
      self.clientId         = '%s-0.59633534294921572' % time.time()
      self._msgId           = 0
      self._cmds            = []
      self._isConnected     = False
      self.fanOf            = []
      self.currentStatus    = 'available'
      self.CHATSERVER_ADDRS = [("chat2.turntable.fm", 80), ("chat3.turntable.fm", 80)]
      self.signals = {}

      host, port = self.get_hashed_addr(self.roomId if self.roomId else str(random.random()))
      url = 'ws://%s:%s/socket.io/websocket' % (host, port)

      #websocket.enableTrace(True)
      self.ws = websocket.WebSocketApp(url, on_message=self.on_message)
      if self.roomId:
         def clb():
            rq = { 'api': 'room.register', 'roomid': self.roomId }
            self._send(rq, None)
         self.callback = clb


   def setTmpSong(self, data):
      self.tmpSong = { 'command': 'endsong', 'room': data.get('room'), 'success': True }


   def on_message(self, ws, msg):
      heartbeat_rgx = '~m~[0-9]+~m~(~h~[0-9]+)'
      if re.match(heartbeat_rgx, msg):
         self._heartbeat(re.match(heartbeat_rgx, msg).group(1))
         self.last_heartbeat = time.time()
         self.updatePresence(None)
         return

      if msg == '~m~10~m~no_session':
         def auth_clb(obj):
            if not self._isConnected:
               self.updatePresence(None)
               self.emit('ready')
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
                     self.emit('roomChanged')
                  self.roomInfo(info_clb)
               else:
                  self.emit('roomChanged')
               self.clb = None

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
         if self.stdout == 'stderr': print '< %s' % msg
         else:                       print '< %s' % msg

      self.ws.send('~m~%s~m~%s' % (len(msg), msg))
      self._cmds.append([self._msgId, rq, callback])
      self._msgId += 1


   def userAuthenticate(self, callback):
      rq = { 'api': 'user.authenticate' }
      self._send(rq, callback)


   def hash_mod(self, a, b):
      d = hashlib.sha1(a).hexdigest()
      c = 0
      for e in d: c += ord(e)
      return c % b


   def get_hashed_addr(self, a):
      return self.CHATSERVER_ADDRS[self.hash_mod(a, len(self.CHATSERVER_ADDRS))]


   def updatePresence(self, callback):
      rq = { 'api': 'presence.update', 'status': self.currentStatus }
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


   def emit(self, signal, *args):
      callbacks = self.signals.get(signal) or []
      for clb in callbacks:
         clb(args)


   def on(self, signal, callback):
      if not signal in self.signals:
         self.signals[signal] = []
      self.signals[signal].append(callback)


   def start(self):
      self.ws.run_forever()
