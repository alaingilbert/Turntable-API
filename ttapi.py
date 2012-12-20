# -*- Coding: utf-8 -*-

import websocket
import urllib2
import time
import hashlib
import random
import re
import json
import logging

__version__ = '1.1.1'

logger = logging.getLogger("turntable-api")


class Bot(object):
    HEARTBEAT_RE = re.compile('~m~[0-9]+~m~(~h~[0-9]+)')
    HEARTBEAT_INTERVAL = 10

    def __init__(self, auth, user_id, room_id=None, rate_limit=None):
        """Create an instance of the Bot.

        rate_limit, when set, should be a float of the time required between
        requests."""
        self.auth = auth
        self.userId = user_id
        self.roomId = None
        self.roomChatServer = None
        self.rateLimit = rate_limit
        self.debug = False
        self.callback = None
        self.currentDjId = None
        self.currentSongId = None
        self.lastActivity = time.time()
        self.lastHeartbeat = self.lastActivity
        self.lastSend = self.lastActivity
        self.clientId = '%s-0.59633534294921572' % self.lastActivity
        self._msgId = 0
        self._cmds = []
        self._isConnected = False
        self.fanOf = set()
        self.tmpSong = None
        self.currentStatus = 'available'
        self.signals = {}
        self.ws = None

        if room_id:
            self.connect(room_id)

    def connect(self, roomId):
        def clb():
            rq = {'api': 'room.register', 'roomid': roomId}
            self._send(rq, None)

        chat_server = self.whichServer(roomId)
        if not chat_server:
            return False
        self.roomChatServer = chat_server
        url = 'ws://%s:%s/socket.io/websocket' % tuple(self.roomChatServer)

        # Disconnect from existing chat server if necessary
        if self.ws and url != self.ws.url:
            self.ws.close()
            self._isConnected = False

        if not self._isConnected:  # Connect if necessary
            self.ws = websocket.WebSocketApp(url, on_message=self.on_message)
            self.callback = clb
        else:  # Directly register for the room
            clb()
        return True

    def setTmpSong(self, data):
        self.tmpSong = {'command': 'endsong', 'room': data.get('room'),
                        'success': True}

    def on_message(self, _, msg):
        # Make lastActivity store the time the most recent message was received
        self.lastActivity = time.time()

        if self.debug:
            logger.debug(msg)

        try:
            obj = json.loads(msg[msg.index('{'):])
        except ValueError:  # Handles both index and json errors
            obj = None

        # 'pre_message' and 'post_message' callbacks are passed a touple
        # containing the original message and the parsed json data (if any)
        self.emit('pre_message', (msg, obj))

        match = self.HEARTBEAT_RE.match(msg)
        if match:
            self._heartbeat(match.group(1))
            self.updatePresence(now=self.lastActivity)
            self.emit('post_message', (msg, obj))
            return
        elif msg == '~m~10~m~no_session':
            def auth_clb(_):
                if not self._isConnected:
                    def fanof(data):
                        self.fanOf |= set(data['fanof'])
                        self.updatePresence(force=True, now=self.lastActivity)
                        self.emit('ready')
                    self.getFanOf(fanof)
                self.callback()
                self._isConnected = True
            self.userAuthenticate(auth_clb)
            self.emit('post_message', (msg, obj))
            return

        # Always attempt to update our presence
        self.updatePresence(now=self.lastActivity)
        for cmd_id, rq, clb in self._cmds:
            if cmd_id == obj.get('msgid'):
                if rq['api'] == 'room.info':
                    if obj['success'] and obj['room']['roomid'] == self.roomId:
                        # Update information about the room the bot is in
                        metadata = obj['room']['metadata']
                        self.currentDjId = metadata['current_dj']
                        currentSong = metadata['current_song']
                        if currentSong:
                            self.currentSongId = currentSong.get('_id')
                        else:
                            self.currentSongId = None
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
                        self.roomChatServer = None

                if clb:
                    clb(obj)

                self._cmds.remove([cmd_id, rq, clb])
                break

        command = obj.get('command')
        # Handle special cases
        if command == 'nosong':
            self.currentDjId = None
            self.currentSongId = None
            self.emit('endsong', self.tmpSong)
        elif command == 'newsong':
            if self.currentSongId:
                self.emit('endsong', self.tmpSong)
            self.currentDjId = obj['room']['metadata']['current_dj']
            self.currentSongId = obj['room']['metadata']['current_song']['_id']
            self.setTmpSong(obj)
        elif command == 'update_votes':
            if self.tmpSong:
                to_update = self.tmpSong['room']['metadata']
                to_update['upvotes'] = obj['room']['metadata']['upvotes']
                to_update['downvotes'] = obj['room']['metadata']['downvotes']
                to_update['listeners'] = obj['room']['metadata']['listeners']
        # Always trigger the callbacks for the command
        self.emit(command, obj)
        self.emit('post_message', (msg, obj))

    def _heartbeat(self, msg):
        if self.debug:
            logger.debug(msg)

        self.ws.send('~m~%s~m~%s' % (len(msg), msg))

    def _send(self, rq, callback=None):
        rq['msgid'] = self._msgId
        rq['clientid'] = self.clientId
        rq['userid'] = rq.get('userid') or self.userId
        rq['userauth'] = self.auth

        msg = json.dumps(rq)

        if self.debug:
            logger.debug(msg)

        # Perform rate limiting
        if self.rateLimit:
            now = time.time()  # We can't use lastActivity here
            sleep_time = self.rateLimit - now + self.lastSend
            if sleep_time > 0:
                time.sleep(sleep_time)
                self.lastSend = now + sleep_time
            else:
                self.lastSend = now

        self.ws.send('~m~%s~m~%s' % (len(msg), msg))
        self._cmds.append([self._msgId, rq, callback])
        self._msgId += 1

    def whichServer(self, roomId):
        dataStr = urllib2.urlopen('http://turntable.fm:80/api/room.which_chat'
                                  'server?roomid=%s' % roomId).read()
        data = json.loads(dataStr)
        if data[0]:
            return data[1]['chatserver']
        else:
            if self.debug:
                logger.debug(data)
        return False

    def roomNow(self, callback=None):
        rq = {'api': 'room.now'}
        self._send(rq, callback)

    def updatePresence(self, callback=None, force=False, now=None):
        if not now:
            now = time.time()
        # Only update if required
        if not force and now < self.lastHeartbeat + self.HEARTBEAT_INTERVAL:
            return
        self.lastHeartbeat = now
        rq = {'api': 'presence.update', 'status': self.currentStatus}
        self._send(rq, callback)

    def listRooms(self, skip=None, callback=None):
        skip = skip if skip else 0
        rq = {'api': 'room.list_rooms', 'skip': skip}
        self._send(rq, callback)

    def directoryGraph(self, callback=None):
        rq = {'api': 'room.directory_graph'}
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
                                return callback({'roomId': room.get('roomid'),
                                                 'room': room, 'user': user,
                                                 'success': True})
                            else:
                                return callback({'roomId': room.get('roomid'),
                                                 'success': True})
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
        rq = {'api': 'room.get_favorites'}
        self._send(rq, callback)

    def addFavorite(self, roomId, callback=None):
        rq = {'api': 'room.add_favorite', 'roomid': roomId}
        self._send(rq, callback)

    def remFavorite(self, roomId, callback=None):
        rq = {'api': 'room.rem_favorite', 'roomid': roomId}
        self._send(rq, callback)

    def roomRegister(self, roomId):
        self.connect(roomId)

    def roomDeregister(self, callback=None):
        rq = {'api': 'room.deregister', 'roomid': self.roomId}
        self._send(rq, callback)

    def roomInfo(self, *args, **kwargs):
        room_id = kwargs.get('room_id', self.roomId)
        rq = {'api': 'room.info', 'roomid': room_id}
        callback = None
        if len(args) == 1:
            if callable(args[0]):
                callback = args[0]
            elif isinstance(args[0], bool):
                rq['extended'] = args[0]
        elif len(args) == 2:
            rq['extended'] = args[0]
            callback = args[1]
        self._send(rq, callback)

    def speak(self, msg, callback=None):
        rq = {'api': 'room.speak', 'roomid': self.roomId, 'text': str(msg)}
        self._send(rq, callback)

    def pm(self, msg, userid, callback=None):
        rq = {'api': 'pm.send', 'receiverid': userid, 'text': str(msg)}
        self._send(rq, callback)

    def pmHistory(self, userid, callback=None):
        rq = {'api': 'pm.history', 'receiverid': userid}
        self._send(rq, callback)

    def bootUser(self, userId, reason='', callback=None):
        rq = {'api': 'room.boot_user', 'roomid': self.roomId,
              'target_userid': userId, 'reason': reason}
        self._send(rq, callback)

    def boot(self, userId, reason='', callback=None):
        self.bootUser(userId, reason, callback)

    def addModerator(self, userId, callback=None):
        rq = {'api': 'room.add_moderator', 'roomid': self.roomId,
              'target_userid': userId}
        self._send(rq, callback)

    def remModerator(self, userId, callback=None):
        rq = {'api': 'room.rem_moderator', 'roomid': self.roomId,
              'target_userid': userId}
        self._send(rq, callback)

    def addDj(self, callback=None):
        rq = {'api': 'room.add_dj', 'roomid': self.roomId}
        self._send(rq, callback)

    def remDj(self, *args):
        djId = None
        callback = None
        if len(args) == 1:
            if callable(args[0]):
                djId = None
                callback = args[0]
            elif isinstance(args[0], basestring):
                djId = args[0]
                callback = None
        elif len(args) == 2:
            djId = args[0]
            callback = args[1]
        rq = {'api': 'room.rem_dj', 'roomid': self.roomId}
        if djId:
            rq['djid'] = djId
        self._send(rq, callback)

    def stopSong(self, callback=None):
        rq = {'api': 'room.stop_song', 'roomid': self.roomId}
        self._send(rq, callback)

    def skip(self):
        self.stopSong()

    def snag(self, callback=None):
        sh = hashlib.sha1(str(random.random())).hexdigest()
        fh = hashlib.sha1(str(random.random())).hexdigest()

        i = [self.userId, self.currentDjId, self.currentSongId, self.roomId,
             'queue', 'board', 'false', 'false', sh]
        vh = hashlib.sha1('/'.join(i)).hexdigest()

        rq = {'api':      'snag.add',
              'djid':     self.currentDjId,
              'songid':   self.currentSongId,
              'roomid':   self.roomId,
              'site':     'queue',
              'location': 'board',
              'in_queue': 'false',
              'blocked':  'false',
              'vh':        vh,
              'sh':        sh,
              'fh':        fh}
        self._send(rq, callback)

    def vote(self, val='up', callback=None):
        vh = hashlib.sha1(self.roomId + val + self.currentSongId).hexdigest()
        th = hashlib.sha1(str(random.random())).hexdigest()
        ph = hashlib.sha1(str(random.random())).hexdigest()
        rq = {'api': 'room.vote', 'roomid': self.roomId, 'val': val, 'vh': vh,
              'th': th, 'ph': ph}
        self._send(rq, callback)

    def bop(self, callback=None):
        self.vote('up', callback)

    def userAuthenticate(self, callback):
        rq = {'api': 'user.authenticate'}
        self._send(rq, callback)

    def userInfo(self, callback=None):
        rq = {'api': 'user.info'}
        self._send(rq, callback)

    def getFanOf(self, callback=None):
        rq = {'api': 'user.get_fan_of'}
        self._send(rq, callback)

    def getFans(self, callback=None):
        rq = {'api': 'user.get_fans'}
        self._send(rq, callback)

    def getUserId(self, name, callback=None):
        rq = {'api': 'user.get_id', 'name': str(name)}
        self._send(rq, callback)

    def getProfile(self, *args):
        rq = {'api': 'user.get_profile'}
        callback = None
        if len(args) == 1:
            if callable(args[0]):
                callback = args[0]
            elif isinstance(args[0], basestring):
                rq['userid'] = args[0]
        elif len(args) == 2:
            rq['userid'] = args[0]
            callback = args[1]
        self._send(rq, callback)

    def modifyProfile(self, profile, callback=None):
        rq = {'api': 'user.modify_profile'}
        for key in ('name', 'twitter', 'facebook', 'website', 'about',
                    'topartists', 'hangout'):
            if profile.get(key):
                rq[key] = profile[key]
        self._send(rq, callback)

    def modifyLaptop(self, laptop='linux', callback=None):
        rq = {'api': 'user.modify', 'laptop': laptop}
        self._send(rq, callback)

    def modifyName(self, name, callback=None):
        rq = {'api': 'user.modify', 'name': name}
        self._send(rq, callback)

    def setAvatar(self, avatarId, callback=None):
        rq = {'api': 'user.set_avatar', 'avatarid': avatarId}
        self._send(rq, callback)

    def becomeFan(self, userId, callback=None):
        rq = {'api': 'user.become_fan', 'djid': userId}
        self._send(rq, callback)

    def removeFan(self, userId, callback=None):
        rq = {'api': 'user.remove_fan', 'djid': userId}
        self._send(rq, callback)

    def playlistAll(self, *args):
        playlistName = 'default'
        callback = None
        if len(args) == 1:
            if isinstance(args[0], basestring):
                playlistName = args[0]
            elif callable(args[0]):
                callback = args[0]
        elif len(args) == 2:
            playlistName = args[0]
            callback = args[1]
        rq = {'api': 'playlist.all', 'playlist_name': playlistName}
        self._send(rq, callback)

    def playlistAdd(self, *args):
        playlistName = 'default'
        songId = None
        index = 0
        callback = None
        if len(args) == 1:
            songId = args[0]
        elif len(args) == 2:
            if isinstance(args[0], basestring) \
                    and isinstance(args[1], basestring):
                playlistName, songId = args
            elif isinstance(args[0], basestring) and callable(args[1]):
                songId, callback = args
            elif isinstance(args[0], basestring) and isinstance(args[1], int):
                songId, index = args
            elif isinstance(args[0], bool) and isinstance(args[1], basestring):
                songId = args[1]
        elif len(args) == 3:
            if isinstance(args[0], basestring) \
                    and isinstance(args[1], basestring) \
                    and isinstance(args[2], int):
                playlistName, songId, index = args
            elif isinstance(args[0], basestring) \
                    and isinstance(args[1], basestring) \
                    and callable(args[2]):
                playlistName, songId, callback = args
            elif isinstance(args[0], basestring) \
                    and isinstance(args[1], int) \
                    and callable(args[2]):
                songId, index, callback = args
            elif isinstance(args[0], bool) and \
                    isinstance(args[1], basestring) and callable(args[2]):
                _, songId, callback = args
        elif len(args) == 4:
            playlistName, songId, index, callback = args
        rq = {'api': 'playlist.add', 'playlist_name': playlistName,
              'song_dict': {'fileid': songId}, 'index': index}
        self._send(rq, callback)

    def playlistRemove(self, *args):
        playlistName = 'default'
        index = 0
        callback = None

        if len(args) == 1:
            index = args[0]
        elif len(args) == 2:
            if isinstance(args[0], basestring) and isinstance(args[1], int):
                playlistName, index = args
            elif isinstance(args[0], int) and callable(args[1]):
                index, callback = args
        elif len(args) == 3:
            playlistName, index, callback = args
        rq = {'api': 'playlist.remove', 'playlist_name': playlistName,
              'index': index}
        self._send(rq, callback)

    def playlistReorder(self, *args):
        playlistName = 'default'
        indexFrom = 0
        indexTo = 0
        callback = None
        if len(args) == 2:
            indexFrom, indexTo = args
        elif len(args) == 3:
            if isinstance(args[0], basestring) and isinstance(args[1], int) \
                    and isinstance(args[2], int):
                playlistName, indexFrom, indexTo = args
            elif isinstance(args[0], int) and isinstance(args[1], int) \
                    and callable(args[2]):
                indexFrom, indexTo, callback = args
        elif len(args) == 4:
            playlistName, indexFrom, indexTo, callback = args
        rq = {'api': 'playlist.reorder', 'playlist_name': playlistName,
              'index_from': indexFrom, 'index_to': indexTo}
        self._send(rq, callback)

    def getStickers(self, callback=None):
        rq = {'api': 'sticker.get'}
        self._send(rq, callback)

    def getStickerPlacements(self, userid, callback=None):
        rq = {'api': 'sticker.get_placements', 'userid': userid}
        self._send(rq, callback)

    def setStatus(self, st, callback=None):
        self.currentStatus = st
        self.updatePresence(callback, force=True)

    def emit(self, signal, data=None):
        callbacks = self.signals.get(signal) or []
        for clb in callbacks:
            clb(data)

    def on(self, signal, callback):
        if not signal in self.signals:
            self.signals[signal] = []
        self.signals[signal].append(callback)

    def start(self):
        try:
            while self.ws:
                self.ws.run_forever()
        except KeyboardInterrupt:
            print('Interrupt received.')
