var Bot    = require('ttapi');
var AUTH   = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID, ROOMID);

bot.on('newsong', function (data) { 
bot.speak('The current song is: ' + data.room.metadata.current_song.metadata.song);
bot.speak('From the artist: ' + data.room.metadata.current_song.metadata.artist);
bot.speak('From the album: ' + data.room.metadata.current_song.metadata.album);
bot.speak('Genre is: ' + data.room.metadata.current_song.metadata.genre);
bot.speak('Start Time is: ' + data.room.metadata.current_song.starttime);
});
