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

### on('deregistered', function (data) { })

### on('speak', function (data) { })

### on('newsong', function (data) { })

### on('update_votes', function (data) { })

### on('booted_user', function (data) { })

### on('update_user', function (data) { })

### on('add_dj', function (data) { })

### on('rem_dj', function (data) { })

### on('new_moderator', function (data) { })

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
