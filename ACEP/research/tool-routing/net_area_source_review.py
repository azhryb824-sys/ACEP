"""A veto/review layer, never permission to execute a model proposal.

Recognizes labelled square-metre measurements, retaining original text spans.
It does not establish intent or complete semantic understanding. In particular,
`consistent_evidence` is NOT grounding approval and must not bypass dispatch.
"""
import re
from calculator import parse_prediction
from contract_gate import gate, number

DIGITS = str.maketrans('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹٫−', '01234567890123456789.-')
LABELS = {
    'gross_m2': r'(?:gross(?:\s+area)?|(?:ال)?إجمالي(?:ة|ه)?|مساحة(?:\s+الوجه)?\s+قبل\s+(?:أي\s+)?(?:ال)?خصم)',
    'openings_m2': r'(?:openings(?:\s+area)?|الفتحات|فتحاته|فتحات|للفتحات|الأبواب\s+والنوافذ)',
}
# Closed neutral vocabulary between a role label and its measurement. Never
# cross another role, a numeric identifier, a clause separator, or a negation.
BRIDGE = r'(?:(?:\s+|[:=])|(?:مساحة|المساحة|مساحته|مساحتها|لوجه|وجه|الوجه|الجدار|الحائط|الدهان|المطلوب|خصمها|للخصم|نحتاج|المراد|المسجلة|المسجل|قياس|قبل|الخصم|يثبت|تسجل|نفسها|مجتمعة|wall|face|area|is|equals|totalling)\b){0,16}'
VALUE = r'(?P<value>صفر|(?:سالب\s+)?[-+]?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+))'
UNIT = r'(?P<unit>م²|م2|متر\s+مربع|m²|m2|square\s+met(?:er|re)s?)'
CAUTION = re.compile(r'(?<!\w)(?:ليس|ليست|غير|تصحيح|الصحيح|عدل|عدّل|اعتمد|تجاهل|افترض|مثال|مثلاً|إذا|لو|أو|بين|تقريب|ignore|not|instead|revised|correction|example|if|assume|or|between)(?!\w)', re.I)
PATTERNS = {key: re.compile(r'(?<!\w)(?:و)?' + label + r'(?!\w)' + BRIDGE + VALUE + r'\s*' + UNIT + r'(?!\w)', re.I) for key, label in LABELS.items()}


def decision(status, reason, **extra):
    return dict(status=status, reason=reason, authorization_granted=False,
                calculation_executed=False, scope='labelled net-area evidence; veto only', **extra)


def extract_evidence(text):
    if not isinstance(text, str) or not text.strip() or len(text) > 4096:
        return decision('review_required', 'invalid_source_text')
    normalized = text.translate(DIGITS)
    if CAUTION.search(normalized) or any(c in text for c in '\"“”«»{}'):
        return decision('review_required', 'context_requires_semantic_review')
    evidence, values = {}, {}
    for key, pattern in PATTERNS.items():
        matches = list(pattern.finditer(normalized))
        if len(matches) != 1:
            return decision('review_required', 'missing_or_duplicate_labelled_measurement', field=key)
        match = matches[0]
        raw = match['value'].replace('سالب', '-').replace('صفر', '0').replace(' ', '')
        try:
            value = number(raw)
        except ValueError:
            return decision('review_required', 'invalid_source_numeric_literal')
        if len(value.as_tuple().digits) > 28 or value.adjusted() > 15 or value.as_tuple().exponent < -12:
            return decision('review_required', 'numeric_precision_or_size_limit')
        values[key] = value
        evidence[key] = dict(start=match.start(), end=match.end(),
                             quote=text[match.start():match.end()],
                             normalized_value=format(value, 'f'), source_unit=match['unit'])
    return dict(status='evidence_extracted', values=values, evidence=evidence,
                authorization_granted=False, calculation_executed=False)


def review(text, proposal):
    """Do not repair arguments. No return value authorizes calculation."""
    if isinstance(proposal, str):
        try:
            proposal = parse_prediction(proposal)
        except (ValueError, TypeError, RecursionError):
            return decision('veto', 'invalid_prediction_json')
    if not isinstance(proposal, dict):
        return decision('veto', 'invalid_prediction_type')
    if proposal.get('action') != 'call' or proposal.get('tool') != 'net_area':
        return decision('not_applicable', 'outside_net_area_call_scope')
    contract = gate(proposal)
    if contract['status'] == 'blocked':
        return decision('veto', 'contract_blocked', errors=contract['errors'])
    source = extract_evidence(text)
    if source['status'] != 'evidence_extracted':
        return source
    values, evidence = source['values'], source['evidence']
    if values['gross_m2'] <= 0 or values['openings_m2'] < 0 or values['openings_m2'] > values['gross_m2']:
        return decision('veto', 'invalid_explicit_source_values', evidence=evidence)
    different = sorted(key for key in values if number(proposal['arguments'][key]) != values[key])
    if different:
        return decision('veto', 'proposal_source_value_mismatch', fields=different, evidence=evidence)
    return decision('consistent_evidence', 'labelled_values_match_only', evidence=evidence,
                    remaining_review=['intent', 'unparsed_context', 'engineering_scope'])
