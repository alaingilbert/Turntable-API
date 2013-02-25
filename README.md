#Turntable API

A simple nodejs wrapper for the turntable API.
You'll need to find your `AUTH`, `USERID` and `ROOMID` information with [this bookmarklet](http://alaingilbert.github.com/Turntable-API/bookmarklet.html).

Ttapi is also available in [Python](https://github.com/alaingilbert/Turntable-API/tree/python_ttapi) and [Ruby](https://github.com/alaingilbert/Turntable-API/tree/ruby_ttapi).

See also [turntabler](https://github.com/obrie/turntabler) (Ruby) maintained by [obrie](https://github.com/obrie).

## Installation
    npm install ttapi
If you are having problems with npm (like with Windows nodejs or portable versions), just clone the repo and edit the templates in the 'examples' folder!

## Examples

### Chat bot

This bot responds to anybody who writes "/hello" in the chat.

```js
var Bot = require('ttapi');
var bot = new Bot(AUTH, USERID, ROOMID);

bot.on('speak', function (data) {
  // Respond to "/hello" command
  if (data.text.match(/^\/hello$/)) {
    bot.speak('Hey! How are you @'+data.name+' ?');
  }
});
```

### Logger

This bot logs the room activity in the console.

```js
var Bot    = require('ttapi');
var AUTH   = 'xxxxxxxxxxxxxxxxxxxxxxxx';
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

[REPL](http://nodejs.org/docs/v0.6.0/api/repl.html) allows you to dynamically call the bot functions and modify his variables during his execution.

```js
var Bot  = require('ttapi')
  , repl = require('repl');

var bot = new Bot(AUTH, USERID, ROOMID);
repl.start('> ').context.bot = bot;

// ...
```

# Debugging

```js
bot.debug = true;
```

That will print on the terminal all the data that you get and all the data that you send.

# Hosting

* [https://c9.io/](https://c9.io/) : Free (up to 128MB memory/storage) hosting for nodejs-based projects with full SSH access, FTP, and unlimited collaborators.
* [https://openshift.redhat.com/](https://openshift.redhat.com/) : Free (up to 1.5GB memory/3GB storage) Git-based PaaS service that supports nodejs with limited SSH access.
* [http://www.heroku.com/](http://www.heroku.com/) : Free (up to 1 dyno/512MB memory/200MB storage) Git-based PaaS service that supports nodejs with a easy-to-use frontend.
* [http://nodester.com/](http://nodester.com/) : Free (unlimited applications/50GB transfer/up to 2GB memory) PaaS service that supports nodejs and comes with easy deployment options.
* [https://modulus.io/](https://modulus.io/) : Cheap (scaleable memory not to be abused) nodejs hosting with $25 credit for a limited time.
* [http://www.nodejitsu.com/](http://www.nodejitsu.com/) : Cheap (scaleable memory/storage not to be abused) hosting for nodejs-based projects.

# Documentation


## Events

[Here are some examples of the data that you'll receive from those events.](https://github.com/alaingilbert/Turntable-API/tree/master/turntable_data)

### on('tcpConnect', function (socket) { })

Triggered when a socket opens a connection.

### on('tcpMessage', function (socket, msg) { })

Triggered when the bot receives a tcp message.

### on('tcpEnd', function (socket) { })

Triggered when a socket closes its connection.

### on('httpRequest', function (request, response) { })

Triggered when the bot receives an http request.

### on('roomChanged', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/room_infos.js)) { })

Triggered when the bot enters a room.

### on('registered', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/registered.js)) { })

Triggered when a user enters the room.

### on('deregistered', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/deregistered.js)) { })

Triggered when a user leaves the room.

### on('speak', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/speak.js)) { })

Triggered when a new message is sent via the chat.

### on('endsong', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/endsong.js)) { })

Triggered at the end of the song. (Just before the newsong/nosong event)

The data returned by this event contains information about the song that has just ended.

### on('newsong', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/newsong.js)) { })

Triggered when a new song starts.

### on('nosong', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/nosong.js)) { })

Triggered when there is no song.

### on('update_votes', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/update_votes.js)) { })

Triggered when a user votes.

###### Note

The userid is shown only if the user vote up, or changed his mind and then vote down.

### on('booted_user', function (data) { })

Triggered when a user gets booted.

### on('update_user', function (data) { })

Triggered when a user updates their name/profile.

### on('add_dj', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/add_dj.js)) { })

Triggered when a user takes a dj spot.

### on('rem_dj', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/rem_dj.js)) { })

Triggered when a user leaves a dj spot.

### on('escort', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/escort.js)) { })

Triggered when a user is escorted off the stage.

### on('new_moderator', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/new_moderator.js)) { })

Triggered when a user is promoted to a moderator.

### on('rem_moderator', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/rem_moderator.js)) { })

Triggered when a user loses his moderator title.

### on('snagged', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/snagged.js)) { })

Triggered when a user queues the currently playing song.

### on('pmmed', function ([data](https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/pmmed.js)) { })

Triggered when the bot receives a private message.


## Actions

### tcpListen ( port, address )

Start a tcp server.

### listen ( port, address )

Start an http server.

### roomNow ( [callback:fn] )

Get the turntable server time.

### listRooms ( skip=0:int [, callback:fn] )

Get 20 rooms.

### directoryGraph ( callback:fn )

Get the location of your friends/idols.

### directoryRooms( options:obj, callback:fn )

Get a directory of rooms

##### options

* `limit` - The number of rooms to return
* `section_aware`
* `sort` - What to sort by

### stalk ( userId:string [, allInformations=false:bool ], callback:fn )

Get the location of a user. If `allInformations` is `true`, you'll also receive the information about the room and the user.

###### Warning

This function will make the bot become a fan of the user.

### getFavorites ( callback:fn )

Get your favorite rooms.

### addFavorite ( roomId:string [, callback:fn ] )

Add a room to your favorite rooms.

### remFavorite ( roomId:string [, callback:fn ] )

Remove a room from your favorite rooms.

### roomRegister ( roomId:string [, callback:fn] )

Register in a room.

### roomDeregister ( [callback:fn] )

Deregister from the current room.

### roomInfo ( [[extended=true:bool, ]callback:fn] )

Get the current room information. Do not include song log if 'extended' is false.

### speak ( msg:string [, callback:fn] )

Broadcast a message in the chat.

### bootUser ( userId:string, reason:string [, callback:fn] )

Boot a user.

### boot ( userId:string, reason:string [, callback:fn] )

Alias of `bootUser()`.

### addModerator ( userId:string [, callback:fn] )

Add a moderator.

### remModerator ( userId:string [, callback:fn] )

Remove a moderator. (Note the person does NOT have to be in the room to remove their moderator status.)

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

Get the current user's information.

### userAvailableAvatars ( callback:fn )

Get all available avatars.

### getAvatarIds ( callback:fn )

Get the avatar ids that the bot can currently use.

### getFanOf ( callback:fn )

Get the list of who you've become a fan of.

### getFans ( callback:fn )

Returns an array of everyone who is a fan of yours.

##### example

```js
bot.getFans(function (data) { console.log(data); });
// { msgid: 7, fans: [ '4e69c14e4fe7d00e7303cd6d', ... ], success: true }
```

### getUserId ( name:string, callback:fn )

Get a user's id by his name.

##### Example

```js
bot.getUserId('@alain_gilbert', function (data) { console.log(data); });
// { msgid: 12, userid: '4deadb0f4fe7d013dc0555f1', success: true }

```

### getProfile ( [[userId:string, ]callback:fn] )

Get a user's profile.

### modifyProfile ( profile:obj [, callback:fn] )

Modify your profile. Any missing properties from the 'profile' object will be replaced with the current values.

##### Arguments

* `profile`:obj (required)
  * `name`:string (optional)
  * `twitter`:string (optional)
  * `facebook`:string (optional)
  * `website`:string (optional)
  * `about`:string (optional)
  * `topartists`:string (optional)
  * `hangout`:string (optional)
* `callback`:fn (optional)

##### Examples

```js
bot.modifyProfile({ website:'http://ttdashboard.com/', about:'My bot.' }, callback);
```

### modifyLaptop ( laptop:enum('linux', 'mac', 'pc', 'chrome' , 'iphone', 'android') [, callback:fn] )

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

###### Warning

This function will not add the song into the queue, only trigger the heart animation. Use this with a callback to `.playlistAdd`, or the latter method alone to queue a song;

### pm (msg:string, receiverId:string [, callback:fn] )

Send a private message.

### pmHistory ( receiverId:string, callback:fn )

Get the private conversation history.

### setStatus ( status:enum('available', 'unavailable', 'away') [, callback:fn ] )

Set your current status.

### playlistListAll ( callback:fn )

List all your playlists.

### playlistCreate ( playlistName:string [ , callback:fn ] )

Create a new playlist.

##### Arguments

* `playlistName` (required)
* `callback` (optional)

##### Examples

```js
bot.playlistCreate(newPlaylistName)
bot.playlistCreate(newPlaylistName, callback)
```

### playlistDelete ( playlistName:string [ , callback:fn ] )

Delete a playlist.

##### Arguments

* `playlistName` (required)
* `callback` (optional)

##### Examples

```js
bot.playlistDelete(playlistName)
bot.playlistDelete(paylistName, callback)
```

### playlistRename ( oldPlaylistName:string, newPlaylistName:string [ , callback:fn ] )

Rename a playlist.

##### Arguments

* `oldPlaylistName` (required)
* `newPlaylistName` (required)
* `callback` (optional)

##### Examples

```js
bot.playlistRename(oldPlaylistName, newPlaylistName)
bot.playlistRename(oldPlaylistName, newPlaylistName, callback)
```

### playlistSwitch ( playlistName:string [ , callabck:fn ] )

Switch to another playlist.

##### Arguments

* `playlistName` (required)
* `callback` (optional)

##### Examples

```js
bot.playlistSwitch(playlistName)
bot.playlistSwitch(playlistName, callback)
```

### playlistAll ( [ playlistName:string, ] callback:fn )

Get all information about a playlist.

##### Arguments

* `playlistName` (optional) default: `default`
* `callback` (required)

##### Examples

```js
bot.playlistAll(callback);
bot.playlistAll(playlistName, callback);
```

### playlistAdd ( [ playlistName:string, ] songId:string [, index:int [, callback:fn]] )

Add a song to a playlist.

#### Arguments

* `playlistName` (optional) default: `default`
* `songId` (required)
* `index` (optional) default: `0`
* `callback` (optional)

##### Examples

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

##### Arguments

* `playlistName` (optional) default: `default`
* `index` (optional) default: `0`
* `callback` (optional)

##### Examples
```js
bot.playlistRemove();
bot.playlistRemove(index);
bot.playlistRemove(index, callback);
bot.playlistRemove(playlistName, index);
bot.playlistRemove(playlistName, index, callback);
```

### playlistReorder ( [ playlistName:string, ] indexFrom:int, indexTo:int [, callback:fn ] )

Reorder a playlist. Take the song at index `indexFrom` and move it to index `indexTo`.

##### Arguments

* `playlistName` (optional) default: `default`
* `indexFrom` (required) default: `0`
* `indexTo` (required) default: `0`
* `callback` (optional)

##### Examples

```js
bot.playlistReorder(indexFrom, indexTo);
bot.playlistReorder(indexFrom, indexTo, callback);
bot.playlistReorder(playlistName, indexFrom, indexTo);
bot.playlistReorder(playlistName, indexFrom, indexTo, callback);
```

### searchSong ( query:string, callback:fn )

Search for songs.

##### Arguments

* `query`
* `callback`

##### Examples

```js
bot.searchSong(query, callback);
```

### getStickers ( callback:fn )

Get all stickers informations.

##### Example

```js
bot.getStickers(function (data) { console.log(data); });
// https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/getstickers.js
```

### getStickerPlacements ( userid:string, callback:fn )

Get the information about a user stickers.

##### Example

```js
bot.getStickerPlacements('4e0889d4a3f7517d1100af78', function (data) { console.log(data); });
// https://github.com/alaingilbert/Turntable-API/blob/master/turntable_data/getstickerplacements.js
```
### placeStickers ( placements:array.&lt;object&gt; [, callback:fn] )

Sets a users stickers.  The placements object is formatted the same as the placements object retrieved 
in the getStickerPlacements callback.

##### Example

```js
var placements = [{
  top: 126,
  angle: -23.325931577,
  sticker_id: '4f86fe84e77989117e000008',
  left: 78
}];
bot.placeStickers(placements);
```
