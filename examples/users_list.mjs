import Bot from 'ttapi';

var AUTH   = process.env.TTAPI_AUTH || 'xxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = process.env.TTAPI_USER || 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = process.env.TTAPI_ROOM || 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID, ROOMID);

var theUsersList = { };

bot.on('roomChanged', function (data) {
  // Reset the users list
  theUsersList = { };

  var users = data.users;
  for (var i=0; i<users.length; i++) {
    var user = users[i];
    theUsersList[user.userid] = user;
  }
});

bot.on('registered', function (data) {
  var user = data.user[0];
  theUsersList[user.userid] = user;
});

bot.on('deregistered', function (data) {
  var user = data.user[0];
  delete theUsersList[user.userid];
});
