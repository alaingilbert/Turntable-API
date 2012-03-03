from bot import Bot
from settings import AUTH, USERID, ROOMID

bot = Bot(AUTH, USERID, ROOMID)
bot.debug = True

def speak(data):
   if data[0]['userid'] == '4deadb0f4fe7d013dc0555f1':
      bot.speak('Repeating my master --> %s' % data[0]['text'])

bot.on('speak', speak)

bot.start()
