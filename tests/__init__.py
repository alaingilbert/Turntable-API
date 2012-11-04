import os, json, inspect

def check_json_results(testinstance, res1):
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        'expected',
                        testinstance.__class__.__name__,
                        inspect.stack()[1][3].replace('test_', '') + '.json')

    with open(path, 'r') as f:
        expected = json.load(f)

    assert res1 == expected
