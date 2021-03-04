import Bot from 'ttapi';

var AUTH   = process.env.TTAPI_AUTH || 'xxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = process.env.TTAPI_USER || 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = process.env.TTAPI_ROOM || 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID, ROOMID);

bot.on('speak', function (data) {
  var text = data.text;
  if (text == '/go') {
    // Bot gets on the DJ table (if there's a spot open) on /go command
    bot.addDj();
  } else if (text == '/stop') {
    // Bot jumps off the table on /stop command
    bot.remDj();
  } else if (text == '/skip') {
    // Bot skips it's own song (if bot is the current DJ) on /skip command
    bot.skip();
  } else if (text == '/addsong') {
    // Bot adds song to the bottom of it's DJ queue on /addsong command
    bot.playlistAll(function (data) {
      bot.playlistAdd(songId, data.list.length);
    });
    bot.snag();
  }
});
