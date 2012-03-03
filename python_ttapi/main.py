from bot import Bot
from settings import AUTH, USERID, ROOMID

if __name__ == "__main__":
   bot = Bot(AUTH, USERID, ROOMID)

   def speak(data):
      if data[0]['userid'] == '4deadb0f4fe7d013dc0555f1':
         bot.speak('Repeating my master --> %s' % data[0]['text'])

   bot.on('speak', speak)

   bot.start()
