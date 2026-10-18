"""Four elementary calculations. No language-model inference or text grounding.

This module is for research and explicit inputs, not an authorization boundary.
Never route model-generated arguments here before independently grounding them.
"""
import json
from decimal import Decimal, localcontext
from contract_gate import gate, number


def parse_prediction(raw):
    """Reject duplicate JSON keys and non-standard numeric constants."""
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError('duplicate_json_key:' + key)
            result[key] = value
        return result

    def reject(value):
        raise ValueError('invalid_json_constant:' + value)

    return json.loads(raw, object_pairs_hook=pairs, parse_constant=reject)


def calculate_explicit_inputs(prediction):
    """Validate and calculate supplied inputs; this does not verify their source."""
    checked = gate(prediction)
    if checked['status'] == 'blocked':
        return checked
    if prediction['action'] != 'call':
        return checked
    args = prediction['arguments']
    numeric = {key: number(value) for key, value in args.items()
               if key not in {'unit', 'quantity_unit', 'price_unit'}}
    # Bounds protect arithmetic precision/resources, not engineering feasibility.
    if any(len(value.as_tuple().digits) > 28 or value.adjusted() > 15
           or value.as_tuple().exponent < -12 for value in numeric.values()):
        return {'status': 'blocked', 'errors': ['numeric_precision_or_size_limit'],
                'calculation_executed': False}
    tool = prediction['tool']
    with localcontext() as context:
        context.prec = 128
        if tool == 'rectangular_volume':
            value = (numeric['length_m'] * numeric['width_m'] *
                     numeric['height_m'] * numeric['count'])
            unit = 'm3'
        elif tool == 'net_area':
            value = numeric['gross_m2'] - numeric['openings_m2']
            unit = 'm2'
        elif tool == 'add_waste':
            value = numeric['net_quantity'] * (1 + numeric['waste_percent'] / Decimal(100))
            unit = args['unit']
        else:  # gate has already restricted tool to the four supported names.
            value = numeric['quantity'] * numeric['unit_price']
            unit = 'SAR'
    text = format(value, 'f')
    if '.' in text:
        text = text.rstrip('0').rstrip('.')
    return {'status': 'calculated', 'value': text if value else '0', 'unit': unit,
            'calculation_executed': True, 'text_grounding_verified': False,
            'scope': 'explicit supplied inputs only; research calculator'}
