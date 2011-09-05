#Turntable API

A simple nodejs wrapper for the turntable API

## Installation
    npm install ttapi

## Examples

### Simple
    (function () {
       var Bot    = require('ttapi');
       var AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
       var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
       var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

       var bot = new Bot(AUTH, USERID, function () {
       bot.roomRegister(ROOMID, function () {

       bot.on('speak',        function (data) { console.log('Someone has spoken', data); });
       bot.on('update_votes', function (data) { console.log('Someone has voted',  data); });
       bot.on('registered',   function (data) { console.log('Someone registered', data); });

       }); });
    })();


# Documentation


## Events

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


## Actions

### roomNow ( [callback:fn] )

### listRooms ( skip=0:int [, callback:fn] )

### roomRegister ( roomId:string [, callback:fn] )

### roomDeregister ( [callback:fn] )

### roomInfo ( [callback:fn] )

### speak ( msg:string [, callback:fn] )

### bootUser ( userId:string [, callback:fn] )

### addDj ( [callback:fn] )

### remDj ( [[userId:string, ]callback:fn] )

### stopSong ( [callback:fn] )

### vote ( val:enum('up', 'down') [, callback:fn] )

### userAuthenticate ( [callback:fn] )

### userInfo ( [callback:fn] )

### modifyLaptop ( laptop:enum('linux', 'mac', 'pc', 'chrome') [, callback:fn] )

### modifyName ( name:string [, callback:fn] )

### setAvatar ( avatarId:int [, callback:fn] )

### playlistAll ( playlistName:string [, callback:fn] )

### playlistAdd ( playlistName:string, songId:string [, callback:fn] )

### playlistRemove ( playlistName:string, index:int [, callback:fn] )
