#Turntable API

A simple nodejs wrapper for the turntable API

# Warning

ttapi will not work with the latest release of `NodeJs (v0.5.8)`.

It work well on v0.4.8 (tested).

## Installation
    npm install ttapi

## Examples

### Chat bot

This bot respond to anybody who write "/hello" on the chat.

```js
var Bot = require('ttapi');
var bot = new Bot(AUTH, USERID, ROOMID);

bot.on('speak', function (data) {
   // Respond to "/hello" command
   if (data.text.match(/^\/hello$/)) {
      bot.speak('Hey! How are you '+data.name+' ?');
   }
});
```

### Http Server

This bot create an http server and give his version number when we ask for "http://127.0.0.1:8080/version/" this page.

```js
var Bot = require('ttapi');
var bot = new Bot(AUTH, USERID, ROOMID);
bot.listen(8080, '127.0.0.1');

var myScriptVersion = '0.0.0';

bot.on('httpRequest', function (req, res) {
   var method = req.method;
   var url    = req.url;
   switch (url) {
      case '/version/':
         if (method == 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('{"version":"'+myScriptVersion+'"}');
         } else {
            res.writeHead(500);
            res.end();
         }
         break;
      default:
         res.writeHead(500);
         res.end();
         break;
   }
});
```

### TCP Server

This bot open a tcp server. That will allow you to easily communicate with the bot via a terminal.

```js
var Bot = require('ttapi');
var bot = new Bot(AUTH, USERID, ROOMID);
bot.tcpListen(8080, '127.0.0.1');

var myScriptVersion = 'V0.0.0';

bot.on('tcpConnect', function (socket) { });
bot.on('tcpMessage', function (socket, msg) {
   if (msg == 'version') {
      socket.write('>> '+myScriptVersion+'\n');
   }
});
bot.on('tcpEnd', function (socket) { });
```

You can communicate with the bot like this:

    nc 127.0.0.1 8080

And then type:

    version


### Simple

```js
var Bot    = require('ttapi');
var AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID);

bot.on('ready',        function (data) { bot.roomRegister(ROOMID); });
bot.on('roomChanged',  function (data) { console.log('The bot has changed room.', data); });

bot.on('speak',        function (data) { console.log('Someone has spoken', data); });
bot.on('update_votes', function (data) { console.log('Someone has voted',  data); });
bot.on('registered',   function (data) { console.log('Someone registered', data); });
```

# Debugging

```js
bot.debug = true;
```

That will print on the terminal all the data that you get and all the data that you send.


# Documentation


## Events

[Here are some examples of the data that you'll receive from those events.](https://github.com/alaingilbert/Turntable-API/tree/master/turntable_data)

### on('tcpConnect', function (socket) { })

Triggered when a socket open a connection.

### on('tcpMessage', function (socket, msg) { })

Triggered when the bot receive a message.

### on('tcpEnd', function (socket) { })

Triggered when a socket close its connection.

### on('httpRequest', function (request, response) { })

Triggered when the bot receive an http request.

### on('registered', function (data) { })

Triggered when a user register in the room.

### on('deregistered', function (data) { })

Triggered when a user leave the room.

### on('speak', function (data) { })

Triggered when a new message is send via the chat.

### on('newsong', function (data) { })

Triggered when a new song start.

### on('nosong', function (data) { })

Triggered when there is no song.

### on('update_votes', function (data) { })

Triggered when a user vote.

### on('booted_user', function (data) { })

Triggered when a user is booted.

### on('update_user', function (data) { })

Triggered when a user change his name/infos.

### on('add_dj', function (data) { })

Triggered when a user take a dj spot.

### on('rem_dj', function (data) { })

Triggered when a user leave a dj spot.

### on('new_moderator', function (data) { })

Triggered when a user is granted to moderator title.

### on('rem_moderator', function (data) { })

Triggered when a user loose his moderator title.


## Actions

### tcpListen ( port, address )

Start a tcp server.

### listen ( port, address )

Start a http server.

### roomNow ( [callback:fn] )

Get the turntable server time.

### listRooms ( skip=0:int [, callback:fn] )

Get 20 rooms.

### roomRegister ( roomId:string [, callback:fn] )

Register in a room.

### roomDeregister ( [callback:fn] )

Deregister from the current room.

### roomInfo ( [callback:fn] )

Get the current room informations.

### speak ( msg:string [, callback:fn] )

Broadcast a message on the chat.

### bootUser ( userId:string, reason:string [, callback:fn] )

Boot a user.

### addModerator ( userId:string [, callback:fn] )

Add a moderator.

### remModerator ( userId:string [, callback:fn] )

Remove a moderator.

### addDj ( [callback:fn] )

Add yourself as a Dj.

### remDj ( [[userId:string, ]callback:fn] )

Remove a Dj.

### stopSong ( [callback:fn] )

Skip the current song.

### vote ( val:enum('up', 'down') [, callback:fn] )

Vote for the current song.

### userAuthenticate ( [callback:fn] )

Authenticate the user.

### userInfo ( [callback:fn] )

Get the current user informations.

### modifyLaptop ( laptop:enum('linux', 'mac', 'pc', 'chrome') [, callback:fn] )

Modify your laptop.

### modifyName ( name:string [, callback:fn] )

Modify your name.

### setAvatar ( avatarId:int [, callback:fn] )

Set your avatar.

### becomeFan ( userId:string [, callback:fn] )

Fan someone.

### removeFan ( userId:string [, callback:fn] )

Unfan someone.

### playlistAll ( playlistName:string [, callback:fn] )

Get all informations about a playlist.

### playlistAdd ( playlistName:string, songId:string [, callback:fn] )

Add a song on a playlist.

### playlistRemove ( playlistName:string, index:int [, callback:fn] )

Remove a song on a playlist.
