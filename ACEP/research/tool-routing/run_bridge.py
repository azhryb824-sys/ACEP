"""Single bounded JSON request on stdin, single JSON response on stdout."""
import sys
import json
from grounded_dispatch import dispatch, stopped
from calculator import parse_prediction


def handle(request):
    if not isinstance(request, dict) or set(request) - {'text', 'prediction'} or 'text' not in request:
        return stopped('blocked', 'invalid_request_contract')
    if 'prediction' in request and not isinstance(request['prediction'], str):
        return stopped('blocked', 'prediction_must_be_raw_json_string')
    return dispatch(request['text'], request.get('prediction'))


if __name__ == '__main__':
    try:
        raw = sys.stdin.read(16385)
        result = stopped('blocked', 'request_too_large') if len(raw) > 16384 else handle(parse_prediction(raw))
    except (ValueError, TypeError, RecursionError):
        result = stopped('blocked', 'invalid_request_json')
    print(json.dumps(result, ensure_ascii=False, allow_nan=False))
