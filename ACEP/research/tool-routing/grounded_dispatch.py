"""Ground four tool calls in a deliberately restricted Arabic field grammar.

Every nonempty segment must be recognized in full. No free-form NLP, defaults,
negation handling, multi-element aggregation or implicit engineering inference.
"""
import re
from decimal import Decimal, localcontext
from calculator import calculate_explicit_inputs, parse_prediction
from contract_gate import SPECS, gate, number
from net_area_source_review import review as review_area_proposal

INTENTS = {
    'حجم مستطيل': 'rectangular_volume',
    'صافي المساحة': 'net_area',
    'كمية بعد الهدر': 'add_waste',
    'تكلفة التوريد': 'line_cost',
}
LABELS = {
    'rectangular_volume': {'الطول': 'length_m', 'العرض': 'width_m',
                           'الارتفاع': 'height_m', 'السمك': 'height_m', 'العدد': 'count'},
    'net_area': {'الإجمالي': 'gross_m2', 'الفتحات': 'openings_m2'},
    'add_waste': {'الصافي': 'net_quantity', 'الهدر': 'waste_percent'},
    'line_cost': {'الكمية': 'quantity', 'سعر الوحدة': 'unit_price'},
}
DIGITS = str.maketrans('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹٫−', '01234567890123456789.-')
NUM = r'(?P<number>[-+]?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+))'
AREA_UNITS = {'م²', 'م2', 'm2'}
PRICE_UNITS = {'ريال/م²', 'ريال/م2', 'SAR/m2'}
LENGTH_UNITS = {'م': Decimal(1), 'متر': Decimal(1), 'سم': Decimal('0.01'),
                'سنتيمتر': Decimal('0.01'), 'مم': Decimal('0.001'),
                'مليمتر': Decimal('0.001')}
ZERO_ALLOWED = {'openings_m2', 'net_quantity', 'waste_percent', 'quantity', 'unit_price'}


def stopped(status, reason, **extra):
    return dict(status=status, reason=reason, calculation_executed=False,
                grounding_scope='restricted explicit field syntax', **extra)


def extract_source(text):
    if not isinstance(text, str) or not text.strip() or len(text) > 4096:
        return stopped('review_required', 'invalid_source_text')
    # Work on original string offsets; normalization is one-character-to-one.
    segments = list(re.finditer(r'[^؛;]+', text))
    if not segments:
        return stopped('review_required', 'unsupported_intent')
    intent = segments[0].group().strip()
    tool = INTENTS.get(intent)
    if tool is None:
        return stopped('review_required', 'unsupported_intent')
    values, evidence = {}, {}
    for segment in segments[1:]:
        original = segment.group()
        stripped = original.strip()
        if not stripped:
            continue
        start = segment.start() + len(original) - len(original.lstrip())
        end = start + len(stripped)
        normalized = stripped.translate(DIGITS)
        match = re.fullmatch(r'(?P<label>[^:]+):\s*' + NUM + r'\s*(?P<unit>[^0-9\s].*|)', normalized)
        if match is None:
            return stopped('review_required', 'unsupported_field_syntax')
        key = LABELS[tool].get(match['label'].strip())
        if key is None:
            return stopped('review_required', 'unsupported_field')
        if key in values:
            return stopped('review_required', 'duplicate_field', field=key)
        raw = match['number']
        if len(raw) > 32:
            return stopped('review_required', 'numeric_precision_or_size_limit')
        value, unit = number(raw), match['unit'].strip()
        if key in {'length_m', 'width_m', 'height_m'}:
            if unit not in LENGTH_UNITS:
                return stopped('review_required', 'unsupported_unit', field=key)
            with localcontext() as context:
                context.prec = 128
                value *= LENGTH_UNITS[unit]
        elif key == 'count':
            if unit:
                return stopped('review_required', 'unsupported_unit', field=key)
        elif key == 'waste_percent':
            if unit != '%':
                return stopped('review_required', 'unsupported_unit', field=key)
        elif key == 'unit_price':
            if unit not in PRICE_UNITS:
                return stopped('review_required', 'unsupported_unit', field=key)
        elif unit not in AREA_UNITS:
            return stopped('review_required', 'unsupported_unit', field=key)
        values[key] = value
        evidence[key] = dict(quote=text[start:end], start=start, end=end,
                             normalized_value=format(value, 'f'), source_unit=unit)
    required = SPECS[tool]['numeric']
    missing = sorted(required - set(values))
    invalid = [key for key, value in values.items()
               if value < 0 or (value == 0 and key not in ZERO_ALLOWED)
               or (key == 'count' and value != value.to_integral_value())]
    if {'gross_m2', 'openings_m2'} <= set(values) and values['openings_m2'] > values['gross_m2']:
        invalid.append('openings_m2')
    if invalid:
        return stopped('invalid_input', 'invalid_explicit_values', fields=sorted(set(invalid)), evidence=evidence)
    if missing:
        return stopped('clarify', 'required_fields_missing', missing_fields=missing,
                       missing_fields_independently_verified=True, evidence=evidence)
    args = {key: (int(value) if key == 'count' else format(value, 'f'))
            for key, value in values.items()}
    args.update(SPECS[tool]['units'])
    return dict(status='ready', tool=tool, arguments=args, evidence=evidence,
                calculation_executed=False, grounding_scope='restricted explicit field syntax')


def dispatch(text, prediction=None):
    """Compare a proposal with independent source extraction, never repair it.

    Omitting prediction calculates a direct explicit-field user request without
    an LLM. Supplying prediction checks both intent and every required value.
    """
    # Veto evidence must run even when the full execution grammar is not
    # supported. A matching or unknown partial review NEVER grants execution;
    # the existing independent, full-segment grammar below remains required.
    if prediction is not None:
        reviewed = review_area_proposal(text, prediction)
        if reviewed['status'] == 'veto':
            if reviewed['reason'] == 'invalid_prediction_json':
                return stopped('blocked', 'invalid_prediction_json')
            return stopped('blocked', 'source_review_veto', source_review=reviewed)
    source = extract_source(text)
    if source['status'] != 'ready':
        return source
    expected = dict(action='call', tool=source['tool'], arguments=source['arguments'], missing_fields=[])
    if prediction is not None:
        if isinstance(prediction, str):
            try:
                prediction = parse_prediction(prediction)
            except (ValueError, TypeError, RecursionError):
                return stopped('blocked', 'invalid_prediction_json')
        checked = gate(prediction)
        if checked['status'] == 'blocked':
            return checked
        if prediction['action'] != 'call' or prediction['tool'] != source['tool']:
            return stopped('review_required', 'prediction_intent_mismatch')
        mismatches = []
        for key in SPECS[source['tool']]['numeric']:
            if number(prediction['arguments'][key]) != number(source['arguments'][key]):
                mismatches.append(key)
        if mismatches:
            return stopped('review_required', 'prediction_value_mismatch', fields=sorted(mismatches))
    result = calculate_explicit_inputs(expected)
    if result['status'] == 'calculated':
        result.update(text_grounding_verified=True,
                      grounding_scope='restricted explicit field syntax',
                      tool=source['tool'], arguments=source['arguments'], evidence=source['evidence'])
    return result
