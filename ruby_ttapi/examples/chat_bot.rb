require "ttapi"

$b = Bot.new("auth+live+XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXXXXXXXXXXX")

def speak(data)
   name = data["name"]
   text = data["text"]

   if /\/hello/.match(text)
      $b.speak("Hello %s" % name)
   end
end

$b.on("speak", method(:speak))

$b.start
