import Bot from 'ttapi';

var AUTH   = process.env.TTAPI_AUTH || 'xxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = process.env.TTAPI_USER || 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = process.env.TTAPI_ROOM || 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID);
 
/*
 * We use a flag to track whether or not we are disconnected. This is because
 * in most cases the underlying WebSocket class will emit 2 events when a
 * connection error occurs: the first indicates an unexpected stream error,
 * and the second indicates that the connection is closed. Tracking the
 * current state allows us to ensure that we are making only one attempt to
 * recover from the connection failure.
 */
var disconnected = false;
 
/*
 * Connect/reconnect to Turntable
 */
function connect(roomid) {
  // Reset the disconnected flag
  disconnected = false;
 
  // Attempt to join the room
  bot.roomRegister(roomid, function (data) {
    if (data && data.success) {
      console.log('Joined ' + data.room.name);
    } else {
      console.log('Failed to join room');
      if (!disconnected) {
        // Set the disconnected flag
        disconnected = true;
        // Try again in 60 seconds
        setTimeout(connect, 60 * 1000, roomid);
      }
    }
  });
}
 
bot.on('ready', function(data) { connect(ROOMID); });
 
bot.on('disconnected', function(e) {
  if (!disconnected) {
    // Set the disconnected flag and display message
    disconnected = true;
    console.log("disconnected: " + e);
    // Attempt to reconnect in 10 seconds
    setTimeout(connect, 10 * 1000, ROOMID);
  }
});
