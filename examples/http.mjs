import Bot from 'ttapi';

var AUTH   = process.env.TTAPI_AUTH || 'xxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = process.env.TTAPI_USER || 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = process.env.TTAPI_ROOM || 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID, ROOMID);
bot.listen(8080, '127.0.0.1');

var myScriptVersion = '0.0.0';

bot.on('httpRequest', function (req, res) {
  var method = req.method;
  var url    = req.url;
  switch (url) {
    case '/version/':
      if (method == 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"version":"'+myScriptVersion+'"}');
      } else {
        res.writeHead(500);
        res.end();
      }
      break;
    default:
      res.writeHead(500);
      res.end();
      break;
  }
});
