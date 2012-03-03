from bot import Bot
from settings import AUTH, USERID, ROOMID

bot = Bot(AUTH, USERID, ROOMID)
#bot.debug = True

def speak(data):
   if data['userid'] == '4deadb0f4fe7d013dc0555f1':
      if data['text'] == '/up':
         bot.addDj()
      elif data['text'] == '/down':
         bot.remDj()
      elif data['text'] == '/skip':
         bot.stopSong()
      elif data['text'] == '/snag':
         bot.snag()
      elif data['text'] == '/bop':
         bot.bop()

def pmmed(data):
   print data


bot.on('speak', speak)
bot.on('pmmed', pmmed)

bot.start()
