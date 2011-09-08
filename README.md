#Turntable API

A simple nodejs wrapper for the turntable API

## Installation
    npm install ttapi

## Examples

### Chat bot

This bot respond to anybody who write "/hello" on the chat.

    var Bot    = require('ttapi');
    var AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
    var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

    var bot = new Bot(AUTH, USERID, ROOMID);

    bot.on('speak', function (data) {
       // Get the data
       var name = data.name;
       var text = data.text;

       // Respond to "/hello" command
       if (text.match(/^\/hello$/)) {
          bot.speak('Hey! How are you '+name+' ?');
       }
    });

### Simple

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

# Documentation


## Events

[Here are some examples of the data that you'll receive from those events.](https://github.com/alaingilbert/Turntable-API/tree/master/turntable_data)

### on('registered', function (data) { })

Triggered when a user register in the room.


### on('deregistered', function (data) { })

Triggered when a user leave the room.


### on('speak', function (data) { })

Triggered when a new message is send via the chat.


### on('newsong', function (data) { })

Triggered when a new song start.

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

### playlistAll ( playlistName:string [, callback:fn] )

Get all informations about a playlist.

### playlistAdd ( playlistName:string, songId:string [, callback:fn] )

Add a song on a playlist.

### playlistRemove ( playlistName:string, index:int [, callback:fn] )

Remove a song on a playlist.
