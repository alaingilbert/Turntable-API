import Bot from 'ttapi';

var AUTH   = process.env.TTAPI_AUTH || 'xxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = process.env.TTAPI_USER || 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = process.env.TTAPI_ROOM || 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID, ROOMID);
bot.tcpListen(8080, '127.0.0.1');

var myScriptVersion = 'V0.0.0';

bot.on('tcpMessage', function (socket, msg) {
  if (msg == 'version') {
    socket.write('>> '+myScriptVersion+'\n');
  }
});
