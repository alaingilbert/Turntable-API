#Turntable API

A simple nodejs wrapper for the turntable API

## Examples

### Simple
    (function () {
       var Bot    = require('./bot').Bot;
       var AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
       var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
       var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

       var bot = new Bot(AUTH, USERID, function () {
       bot.user_authenticate(function () {
       bot.room_register(ROOMID, function () {

       bot.on('speak',        function (data) { console.log('Someone has spoken', data); });
       bot.on('update_votes', function (data) { console.log('Someone has voted',  data); });
       bot.on('registered',   function (data) { console.log('Someone registered', data); });

       }); }); });
    })();

# Documentation

## roomNow ( [callback:fn] )

## listRooms ( skip=0:int [, callback:fn] )

## roomRegister ( roomId:string [, callback:fn] )

## roomDeregister ( [callback:fn] )

## roomInfo ( [callback:fn] )

## speak ( msg:string [, callback:fn] )

## bootUser ( userId:string [, callback:fn] )

## addDj ( [callback:fn] )

## remDj ( [[userId:string, ]callback:fn] )

## stopSong ( [callback:fn] )

## vote ( val:enum('up', 'down') [, callback:fn] )

## userAuthenticate ( [callback:fn] )

## userInfo ( [callback:fn] )

## modifyLaptop ( laptop:enum('linux', 'mac', 'pc', 'chrome') [, callback:fn] )

## modifyName ( name:string [, callback:fn] )

## setAvatar ( avatarId:int [, callback:fn] )

## playlistAll ( playlistName:string [, callback:fn] )

## playlistAdd ( playlistName:string, songId:string [, callback:fn] )

## playlistRemove ( playlistName:string, index:int [, callback:fn] )
