from ttapi import Bot
from mock import MagicMock, call
from tests import check_json_results
import json


class TestTtapi:
    def setup(self):
        self.bot = Bot('AUTH', 'USERID')
        self.bot.connect = MagicMock()
        self.bot.roomRegister('ROOMID')


    def test_pre_message_and_post_message(self):
        self.bot.emit = MagicMock()
        self.bot.on_message(None, '{"command":"test"}')

        calls = self.bot.emit.mock_calls

        check_json_results(self, json.loads(json.dumps(calls)))


    def test_endsong_callback_on_nosong(self):
        self.bot.emit = MagicMock()
        self.bot.on_message(None, '{"command":"nosong"}')

        calls = self.bot.emit.mock_calls

        check_json_results(self, json.loads(json.dumps(calls)))


    def test_endsong_callback_on_newsong(self):
        self.bot.emit = MagicMock()
        tmpSong = {
            'room': {
                'metadata': {
                    'current_dj': 1,
                    'current_song': {'_id': 1}
                }
            }
        }

        data = {
            'command': 'newsong',
            'room': {
                'metadata': {
                    'current_dj': 1,
                    'current_song': {'_id': 1}
                }
            }
        }

        self.bot.currentSongId = 1
        self.bot.tmpSong = tmpSong
        self.bot.on_message(None, json.dumps(data))

        calls = self.bot.emit.mock_calls

        check_json_results(self, json.loads(json.dumps(calls)))
