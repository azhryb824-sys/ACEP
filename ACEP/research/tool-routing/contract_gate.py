from decimal import Decimal, InvalidOperation

SPECS = {'rectangular_volume': {'numeric': {'length_m', 'width_m', 'height_m', 'count'}, 'units': {}}, 'net_area': {'numeric': {'gross_m2', 'openings_m2'}, 'units': {}}, 'add_waste': {'numeric': {'net_quantity', 'waste_percent'}, 'units': {'unit': 'm2'}}, 'line_cost': {'numeric': {'quantity', 'unit_price'}, 'units': {'quantity_unit': 'm2', 'price_unit': 'SAR/m2'}}}

FIELDS = {'length_m', 'width_m', 'height_m', 'count', 'gross_m2', 'openings_m2', 'net_quantity', 'waste_percent', 'quantity', 'unit_price', 'structural_design_and_reinforcement_details'}

def number(value):
    if isinstance(value, bool) or not isinstance(value, (str, int, float)):
        raise ValueError('invalid_numeric_type')
    try:
        result = Decimal(str(value))
    except InvalidOperation:
        raise ValueError('not_numeric')
    if not result.is_finite():
        raise ValueError('non_finite')
    return result

def validate(prediction):
    errors = []
    keys = {'action', 'tool', 'arguments', 'missing_fields'}
    if not isinstance(prediction, dict) or set(prediction) != keys:
        return ['invalid_top_level_contract']
    action = prediction['action']
    args = prediction['arguments']
    missing = prediction['missing_fields']
    if not isinstance(args, dict) or not isinstance(missing, list):
        return ['invalid_container_types']
    if action == 'clarify':
        if prediction['tool'] is not None or args:
            errors.append('clarification_contains_call')
        if not missing or any((not isinstance(x, str) or x not in FIELDS for x in missing)) or len(set((x for x in missing if isinstance(x, str)))) != len(missing):
            errors.append('invalid_missing_fields')
        return errors
    if action == 'invalid_input':
        if prediction['tool'] is not None or args or missing:
            errors.append('invalid_rejection_contract')
        return errors
    if action != 'call':
        return ['unknown_action']
    tool = prediction['tool']
    if not isinstance(tool, str) or tool not in SPECS:
        return ['unsupported_tool']
    if missing:
        errors.append('call_has_missing_fields')
    spec = SPECS[tool]
    required = spec['numeric'] | set(spec['units'])
    for key in sorted(required - set(args)):
        errors.append(f'missing_argument:{key}')
    for key in sorted(set(args) - required):
        errors.append(f'unexpected_argument:{key}')
    values = {}
    for key in sorted(spec['numeric'] & set(args)):
        try:
            values[key] = number(args[key])
        except ValueError as exc:
            errors.append(f'{key}:{exc}')
    for key, expected in spec['units'].items():
        if key in args and args[key] != expected:
            errors.append(f'invalid_unit:{key}')
    for key, value in values.items():
        zero_allowed = key in {'openings_m2', 'net_quantity', 'waste_percent', 'quantity', 'unit_price'}
        if value < 0 or (value == 0 and (not zero_allowed)):
            errors.append(f'invalid_range:{key}')
    if 'count' in values:
        if values['count'] != values['count'].to_integral_value():
            errors.append('count_not_integer')
    if {'gross_m2', 'openings_m2'} <= set(values):
        if values['openings_m2'] > values['gross_m2']:
            errors.append('openings_exceed_gross')
    return errors

def gate(prediction):
    try:
        errors = validate(prediction)
    except Exception:
        errors = ["malformed_contract"]

    if errors:
        return {
            "status": "blocked",
            "errors": errors,
            "calculation_executed": False,
        }

    if prediction["action"] == "call":
        status = "requires_text_grounding"
    elif prediction["action"] == "clarify":
        status = "requires_clarification_review"
    else:
        status = "requires_invalid_input_review"

    return {
        "status": status,
        "contract_valid": True,
        "calculation_executed": False,
    }
