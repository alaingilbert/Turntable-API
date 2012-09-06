var Bot    = require('../index');
var AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID, ROOMID);
bot.tcpListen(8080, '127.0.0.1');

var myScriptVersion = 'V0.0.0';

bot.on('tcpMessage', function (socket, msg) {
  if (msg == 'version') {
    socket.write('>> '+myScriptVersion+'\n');
  }
});
