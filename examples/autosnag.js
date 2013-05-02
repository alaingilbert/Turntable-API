var Bot = require('ttapi');
var AUTH = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID, ROOMID);

bot.on('newsong', function (data) {
  bot.snag();
  bot.playlistAdd(data.room.metadata.current_song._id);
  bot.becomeFan(data.room.metadata.current_dj);
});