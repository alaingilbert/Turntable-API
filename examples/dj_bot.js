var Bot = require('ttapi');
var AUTH   = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID, ROOMID);

 bot.on ('speak', function (data) {
 var text = data.text;
 if (text.match(/^\/go$/)) {
 // Bot gets on the DJ table (if there's a spot open) on /go command
 bot.addDj();
 }
 if (text.match(/^\/stop$/)) {
 // Bot jumps off the table on /stop command
 bot.remDj(USERID);
 }
 if (text.match(/^\/skip$/)) {
 // Bot skips it's own song (if bot is the current DJ) on /skip command
 bot.skip();
 }
 if (text.match(/^\/addsong$/)) {
 // Bot adds song to the bottom of it's DJ queue on /addsong command
 bot.playlistAll(function (data) {
 bot.playlistAdd(songId, data.list.length);
 }); 
 bot.snag();
 }
 });