import json
import subprocess
import sys
import unittest
from pathlib import Path
from grounded_dispatch import dispatch, extract_source
from test_calculator import call


class GroundingTests(unittest.TestCase):
    def test_complete_requests_with_original_evidence(self):
        cases = [
            ('حجم مستطيل؛ الطول: 620 سم؛ العرض: 3.7 م؛ السمك: 160 مم؛ العدد: 1', '3.6704', 'm3'),
            ('حجم مستطيل؛ الطول: ٦٫٨٥ متر؛ العرض: ٢٫٤٥ م؛ الارتفاع: ١٧٫٥ سم؛ العدد: ٦', '17.621625', 'm3'),
            ('صافي المساحة؛ الإجمالي: ٢٠٣٫٦ م²؛ الفتحات: ٣١٫٢ م²', '172.4', 'm2'),
            ('صافي المساحة؛ الإجمالي: 65.2 م²؛ الفتحات: 65.2 م²', '0', 'm2'),
            ('صافي المساحة؛ الإجمالي: 65.2 م²؛ الفتحات: 0 م²', '65.2', 'm2'),
            ('كمية بعد الهدر؛ الصافي: 72.5 م²؛ الهدر: 8 %', '78.3', 'm2'),
            ('كمية بعد الهدر؛ الصافي: 0 م²؛ الهدر: 0 %', '0', 'm2'),
            ('تكلفة التوريد؛ الكمية: 78.3 م²؛ سعر الوحدة: 65 ريال/م²', '5089.5', 'SAR'),
            ('تكلفة التوريد؛ الكمية: 83.9 م²؛ سعر الوحدة: 0 ريال/م²', '0', 'SAR'),
        ]
        for text, value, unit in cases:
            with self.subTest(text=text):
                result = dispatch(text)
                self.assertEqual((result['value'], result['unit']), (value, unit))
                self.assertTrue(result['text_grounding_verified'])
                for evidence in result['evidence'].values():
                    self.assertEqual(text[evidence['start']:evidence['end']], evidence['quote'])

    def test_every_missing_field_is_requested(self):
        cases = [
            ('حجم مستطيل؛ الطول: 6 م', ['count', 'height_m', 'width_m']),
            ('حجم مستطيل؛ الطول: 6 م؛ العرض: 4 م؛ السمك: 15 سم', ['count']),
            ('صافي المساحة', ['gross_m2', 'openings_m2']),
            ('كمية بعد الهدر', ['net_quantity', 'waste_percent']),
            ('تكلفة التوريد', ['quantity', 'unit_price']),
            ('تكلفة التوريد؛ الكمية: 10 م²', ['unit_price']),
        ]
        for text, missing in cases:
            with self.subTest(text=text):
                result = dispatch(text)
                self.assertEqual(result['status'], 'clarify')
                self.assertEqual(result['missing_fields'], missing)
                self.assertTrue(result['missing_fields_independently_verified'])
                self.assertFalse(result['calculation_executed'])

    def test_ambiguous_or_unsupported_source_never_executes(self):
        cases = [
            'حجم مستطيل؛ الطول: 6 م؛ العرض: 4 م؛ العرض: 5 م؛ السمك: 15 سم؛ العدد: 1',
            'حجم مستطيل؛ الطول: 6 م؛ العرض: 4 م؛ الارتفاع: 15 سم؛ السمك: 15 سم؛ العدد: 1',
            'حجم مستطيل؛ الطول: 6 م؛ العرض: 4 م؛ السمك: 15 سم؛ العدد: 1؛ وصبة أخرى',
            'حجم مستطيل؛ الطول: 6 م؛ العرض: 4 م؛ السمك: 15 سم؛ العدد: 1؛ افترض العدد 2',
            'حجم مستطيل؛ الطول: 6 م؛ العرض: ليس 4 م؛ السمك: 15 سم؛ العدد: 1',
            'حجم مستطيل؛ الطول: 6 م؛ العرض: 4 م؛ السمك: 15 سم؛ العدد: 1؛ رقم الكشف: 742',
            'حجم مستطيل؛ الطول: 6 م؛ العرض: 4 م؛ السمك: 15 سم؛ العدد: 1؛ تكلفة التوريد',
            'تكلفة التوريد؛ الكمية: 10 م²؛ سعر الوحدة: 5 ريال/م3',
            'حجم مستطيل؛ الطول: 1e9 م؛ العرض: 4 م؛ السمك: 15 سم؛ العدد: 1',
            'حجم مستطيل؛ الطول: 6 م العرض: 4 م؛ السمك: 15 سم؛ العدد: 1',
            'احسب حجم بلاطة 6×4 متر بسمك 15 سم',
            'حجم مستطيل؛ الطول: 6 م؛ العرض: 4 م؛ السمك: 15 سم؛ العدد: ثلاثة',
        ]
        for text in cases:
            with self.subTest(text=text):
                result = dispatch(text)
                self.assertEqual(result['status'], 'review_required')
                self.assertFalse(result['calculation_executed'])

    def test_invalid_source_never_executes_even_if_incomplete(self):
        cases = [
            'حجم مستطيل؛ الطول: -6 م',
            'حجم مستطيل؛ الطول: 6 م؛ العرض: 4 م؛ السمك: 0 سم؛ العدد: 1',
            'حجم مستطيل؛ الطول: 6 م؛ العرض: 4 م؛ السمك: 15 سم؛ العدد: 1.5',
            'صافي المساحة؛ الإجمالي: 45 م²؛ الفتحات: 46 م²',
            'صافي المساحة؛ الإجمالي: 45 م²؛ الفتحات: -4 م²',
            'كمية بعد الهدر؛ الصافي: 10 م²؛ الهدر: -2 %',
            'تكلفة التوريد؛ الكمية: 10 م²؛ سعر الوحدة: -5 ريال/م²',
        ]
        for text in cases:
            with self.subTest(text=text):
                result = dispatch(text)
                self.assertEqual(result['status'], 'invalid_input')
                self.assertFalse(result['calculation_executed'])

    def test_proposals_cannot_override_source(self):
        text = 'حجم مستطيل؛ الطول: 620 سم؛ العرض: 3.7 م؛ السمك: 160 مم؛ العدد: 1'
        args = dict(length_m='6.2', width_m='3.7', height_m='0.16', count=1)
        self.assertEqual(dispatch(text, call('rectangular_volume', **args))['status'], 'calculated')
        for key, value in [('length_m', '.62'), ('width_m', '9'), ('height_m', '.016'), ('count', 2)]:
            with self.subTest(field=key):
                result = dispatch(text, call('rectangular_volume', **dict(args, **{key: value})))
                self.assertEqual(result['reason'], 'prediction_value_mismatch')
                self.assertFalse(result['calculation_executed'])
        result = dispatch(text, call('net_area', gross_m2=10, openings_m2=0))
        self.assertEqual(result['reason'], 'prediction_intent_mismatch')
        missing_source = 'حجم مستطيل؛ الطول: 620 سم؛ السمك: 160 مم؛ العدد: 1'
        self.assertEqual(dispatch(missing_source, call('rectangular_volume', **args))['missing_fields'], ['width_m'])
        self.assertEqual(dispatch(text, '{"action":"call","action":"clarify"}')['reason'], 'invalid_prediction_json')

    def test_fresh_process_protocol(self):
        request = dict(text='تكلفة التوريد؛ الكمية: 83.9 م²؛ سعر الوحدة: 0 ريال/م²')
        script = Path(__file__).with_name('run_bridge.py')
        process = subprocess.run([sys.executable, str(script)], input=json.dumps(request), text=True, capture_output=True, check=True)
        self.assertEqual(json.loads(process.stdout)['value'], '0')
        process = subprocess.run([sys.executable, str(script)], input='{"text":"a","text":"b"}', text=True, capture_output=True, check=True)
        self.assertEqual(json.loads(process.stdout)['reason'], 'invalid_request_json')


if __name__ == '__main__':
    unittest.main()
