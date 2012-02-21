#Turntable API

A simple nodejs wrapper for the turntable API

## Installation
    npm install ttapi

Find your `AUTH`, `USERID` and `ROOMID` informations with [that bookmarklet](http://alaingilbert.github.com/Turntable-API/bookmarklet.html). 

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

### Dynamic bot

```js
var Bot  = require('ttapi')
  , repl = require('repl');

var bot = new Bot(AUTH, USERID, ROOMID);
repl.start('> ').context.bot = bot;

// ...
```

[REPL](http://nodejs.org/docs/v0.6.0/api/repl.html) allows you to dynamically call the bot functions and modify his variables during his execution.

# Debugging

```js
bot.debug = true;
```

That will print on the terminal all the data that you get and all the data that you send.

# Hosting

[https://no.de/](https://no.de/) : Free hosting for nodejs projects.

# Documentation


## Events

[Here are some examples of the data that you'll receive from those events.](https://github.com/alaingilbert/Turntable-API/tree/master/turntable_data)

### on('tcpConnect', function (socket) { })

Triggered when a socket open a connection.

### on('tcpMessage', function (socket, msg) { })

Triggered when the bot receive a tcp message.

### on('tcpEnd', function (socket) { })

Triggered when a socket close its connection.

### on('httpRequest', function (request, response) { })

Triggered when the bot receive an http request.

### on('roomChanged', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/room_infos.js)) { })

Triggered when the bot enter in a room.

### on('registered', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/registered.js)) { })

Triggered when a user enter the room.

### on('deregistered', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/deregistered.js)) { })

Triggered when a user leave the room.

### on('speak', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/speak.js)) { })

Triggered when a new message is send via the chat.

### on('endsong', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/endsong.js)) { })

Triggered at the end of the song. (Just before the newsong/nosong event)

The data returned by this event contain informations about the song that have just ended.

### on('newsong', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/newsong.js)) { })

Triggered when a new song start.

### on('nosong', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/nosong.js)) { })

Triggered when there is no song.

### on('update_votes', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/update_votes.js)) { })

Triggered when a user vote.

### on('booted_user', function (data) { })

Triggered when a user is booted.

### on('update_user', function (data) { })

Triggered when a user change his name/infos.

### on('add_dj', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/add_dj.js)) { })

Triggered when a user take a dj spot.

### on('rem_dj', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/rem_dj.js)) { })

Triggered when a user leave a dj spot.

### on('new_moderator', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/new_moderator.js)) { })

Triggered when a user is granted to moderator title.

### on('rem_moderator', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/rem_moderator.js)) { })

Triggered when a user loose his moderator title.

### on('snagged', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/snagged.js)) { })

Triggered when a user queues the currently playing song.

### on('pmmed', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/pmmed.js)) { })

Triggered when the bot receive a private message.


## Actions

### tcpListen ( port, address )

Start a tcp server.

### listen ( port, address )

Start a http server.

### roomNow ( [callback:fn] )

Get the turntable server time.

### listRooms ( skip=0:int [, callback:fn] )

Get 20 rooms.

### directoryGraph ( callback:fn )

Get the location of your friends/idols.

### stalk ( userId:string [, allInformations=false:bool ], callback:fn )

Get the location of a user. If `allInformations` is `true`, you'll also receive the informations about the room and the user.

#### Warning

This function will make the bot becoming fan of the user.

### getFavorites ( callback:fn )

Get your favorites rooms.

### addFavorite ( roomId:string [, callback:fn ] )

Add a room to your favorite.

### remFavorite ( roomId:string [, callback:fn ] )

Remove a room from your favorite.

### roomRegister ( roomId:string [, callback:fn] )

Register in a room.

### roomDeregister ( [callback:fn] )

Deregister from the current room.

### roomInfo ( [[extended=true:bool, ]callback:fn] )

Get the current room informations. Do not include song log if 'extended' is false.

### speak ( msg:string [, callback:fn] )

Broadcast a message on the chat.

### bootUser ( userId:string, reason:string [, callback:fn] )

Boot a user.

### boot ( userId:string, reason:string [, callback:fn] )

Alias of `bootUser()`.

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

### skip ( [callback:fn] )

Alias of `stopSong()`.

### vote ( val:enum('up', 'down') [, callback:fn] )

Vote for the current song.

### bop ( )

Alias of `vote('up')`.

### userAuthenticate ( [callback:fn] )

Authenticate the user.

### userInfo ( [callback:fn] )

Get the current user informations.

### getFanOf ( callback:fn )

Get the list of who you became fan.

### getProfile ( [[userId:string, ]callback:fn] )

Get a user profile.

### modifyProfile ( profile:obj [, callback:fn] )

Modify your profile. Any missing properties from the 'profile' object will be replaced with the current values.

#### Arguments

* `profile`:obj (required)
  * `name`:string (optional)
  * `twitter`:string (optional)
  * `facebook`:string (optional)
  * `website`:string (optional)
  * `about`:string (optional)
  * `topartists`:string (optional)
  * `hangout`:string (optional)
* `callback`:fn (optional)

#### Examples

```js
bot.modifyProfile({ website:'http://ttdashboard.com/', about:'My bot.' }, callback);
```

### modifyLaptop ( laptop:enum('linux', 'mac', 'pc', 'chrome' , 'iphone') [, callback:fn] )

Modify your laptop.

### modifyName ( name:string [, callback:fn] )

Modify your name.

### setAvatar ( avatarId:int [, callback:fn] )

Set your avatar.

### becomeFan ( userId:string [, callback:fn] )

Fan someone.

### removeFan ( userId:string [, callback:fn] )

Unfan someone.

### snag ( [ callback:fn ] )

Snag the song.

#### Warning

This function will not add the song into the queue.

### pm (msg:string, receiverId:string, [ callback:fn ] )

Send a private message.

### pmHistory ( receiverId:string, callback:fn )

Get the private conversation history.

### setStatus ( status:enum('available', 'unavailable', 'away') [, callback:fn ] )

Set your current status.

### playlistAll ( [ playlistName:string, ] callback:fn )

Get all informations about a playlist.

#### Arguments

* `playlistName` (optional) default: `default`
* `callback` (required)

#### Examples

```js
bot.playlistAll(callback);
bot.playlistAll(playlistName, callback);
```

### playlistAdd ( [ playlistName:string, ] songId:string [, index:int [, callback:fn]] )

Add a song on a playlist.

#### Arguments

* `playlistName` (optional) default: `default`
* `songId` (required)
* `index` (optional) default: `0`
* `callback` (optional)

#### Examples

```js
bot.playlistAdd(songId);
bot.playlistAdd(songId, idx);
bot.playlistAdd(songId, callback);
bot.playlistAdd(songId, idx, callback);
bot.playlistAdd(playlistName, songId, idx);
bot.playlistAdd(playlistName, songId, callback);
bot.playlistAdd(playlistName, songId, idx, callback);
bot.playlistAdd(false, songId, callback); // Backward compatibility
bot.playlistAdd(false, songId);           // Backward compatibility
````

### playlistRemove ( [ playlistName:string, ] index:int [, callback:fn ] )

Remove a song on a playlist.

#### Arguments

* `playlistName` (optional) default: `default`
* `index` (optional) default: `0`
* `callback` (optional)

#### Examples
```js
bot.playlistRemove();
bot.playlistRemove(index);
bot.playlistRemove(index, callback);
bot.playlistRemove(playlistName, index);
bot.playlistRemove(playlistName, index, callback);
```

### playlistReorder ( [ playlistName:string, ] indexFrom:int, indexTo:int [, callback:fn ] )

Reorder a playlist. Take the song at index `indexFrom` and move it to index `indexTo`.

#### Arguments

* `playlistName` (optional) default: `default`
* `indexFrom` (required) default: `0`
* `indexTo` (required) default: `0`
* `callback` (optional)

#### Examples

```js
bot.playlistReorder(indexFrom, indexTo);
bot.playlistReorder(indexFrom, indexTo, callback);
bot.playlistReorder(playlistName, indexFrom, indexTo);
bot.playlistReorder(playlistName, indexFrom, indexTo, callback);
```
