var Bot    = require('ttapi');
var AUTH   = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID, ROOMID);

bot.on('endsong', function (data) { 
  var currentdj = data.room.metadata.current_dj;
  var song = data.room.metadata.current_song.metadata.song;
  var artist = data.room.metadata.current_song.metadata.artist;
  var album = data.room.metadata.current_song.metadata.album;
  var up_votes = data.room.metadata.upvotes;
  var down_votes = data.room.metadata.downvotes;
  var listeners = data.room.metadata.listeners;
  var snags = 0;

  bot.speak(song +" ( "+up_votes+" :+1: "+down_votes+" :-1: "+snags+" <3 "+listeners+" :busts_in_silhouette: )");

});