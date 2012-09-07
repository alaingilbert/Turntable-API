# Turntable API

A simple ruby wrapper for the turntable API

## Installation
    gem install ttapi

Find your `AUTH`, `USERID` and `ROOMID` informations with [that bookmarklet](http://alaingilbert.github.com/Turntable-API/bookmarklet.html). 

## Examples

### Chat bot

This bot responds to anybody who writes "/hello" in the chat.

```rb
require "ttapi"
$b = Bot.new(AUTH, USERID, ROOMID)

def speak(data)
   name = data["name"]
   text = data["text"]

   if /\/hello/.match(text)
      $b.speak("Hello %s" % name)
   end
end

$b.on("speak", method(:speak))

$b.start
```
