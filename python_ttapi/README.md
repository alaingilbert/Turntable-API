## Examples

### Chat bot

This bot respond to anybody who write "/hello" on the chat.

```py
from ttapi import Bot
bot = Bot(AUTH, USERID, ROOMID)

def speak(data):
   name = data['name']
   text = data['text']
   if text == '/hello':
      bot.speak('Hey! How are you %s ?' % name)

bot.on('speak', speak)

bot.start()
```

### Simple

```py
from ttapi import Bot
bot = Bot(AUTH, USERID, ROOMID)

# Define callbacks
def roomChanged(data): print 'The bot has changed room.', data
def speak(data):       print 'Someone has spoken.',       data
def updateVotes(data): print 'Someone has voted.',        data
def registered(data):  print 'Someone registered.',       data

# Bind listeners
bot.on('roomChanged',  roomChanged)
bot.on('speak',        speak      )
bot.on('update_votes', updateVotes)
bot.on('registered',   registered )

# Start the bot
bot.start()
```
