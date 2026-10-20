import copy
import json
from pathlib import Path
import subprocess
import sys
import unittest
from net_area_source_review import review


def call(gross, openings):
    return dict(action='call', tool='net_area', arguments=dict(gross_m2=gross, openings_m2=openings), missing_fields=[])


class SourceReviewTests(unittest.TestCase):
    def test_long_whitespace_is_bounded(self):
        request = dict(text='Gross:'+(' '*3000)+'missing; openings: 1 m2.', prediction=json.dumps(call('2','1')))
        process = subprocess.run([sys.executable,str(Path(__file__).with_name('run_bridge.py'))],
                                 input=json.dumps(request),text=True,capture_output=True,check=True,timeout=2)
        result=json.loads(process.stdout)
        self.assertEqual(result['status'],'review_required')
        self.assertFalse(result['calculation_executed'])

    def test_bridge_veto_and_no_partial_evidence_bypass(self):
        from grounded_dispatch import dispatch
        text = 'الكشف الإجمالي لوجه الدهان 510.306 م²؛ قياس فتحاته 510.431 م². استخرج مدخلات الصافي.'
        request = dict(text=text, prediction=json.dumps(call('510.431', '510.306')))
        process = subprocess.run([sys.executable, str(Path(__file__).with_name('run_bridge.py'))],
                                 input=json.dumps(request), text=True, capture_output=True, check=True)
        result = json.loads(process.stdout)
        self.assertEqual(result['reason'], 'source_review_veto')
        self.assertFalse(result['calculation_executed'])
        natural = 'Gross: 891.372 m2; openings: 62.418 m2. Net area.'
        result = dispatch(natural, call('891.372', '62.418'))
        self.assertEqual(result['status'], 'review_required')
        self.assertFalse(result['calculation_executed'])
        strict = 'صافي المساحة؛ الإجمالي: 891.372 م²؛ الفتحات: 62.418 م²'
        result = dispatch(strict, call('891.372', '62.418'))
        self.assertEqual((result['status'], result['value']), ('calculated', '828.954'))

    def test_actual_v8_swapped_proposal_is_vetoed(self):
        text = 'الكشف الإجمالي لوجه الدهان 510.306 م²؛ قياس فتحاته 510.431 م². استخرج مدخلات الصافي.'
        result = review(text, call('510.431', '510.306'))
        self.assertEqual(result['reason'], 'invalid_explicit_source_values')
        self.assertEqual(result['status'], 'veto')
        self.assertEqual(result['evidence']['gross_m2']['normalized_value'], '510.306')

    def test_role_order_digits_zero_and_equality(self):
        cases = [
            ('Gross area: 891.372 m2; openings area: 62.418 m2. Net area requested.', '891.372', '62.418'),
            ('Openings = 62.418 m²; gross = 891.372 m². Net area.', '891.372', '62.418'),
            ('الإجمالي: ٨٩١٫٣٧٢ م²؛ الفتحات: ٦٢٫٤١٨ م². احسب الصافي.', '891.372', '62.418'),
            ('إجمالي وجه الحائط 231.875 متر مربع؛ فتحاته 0 متر مربع. الصافي مطلوب.', '231.875', '0'),
            ('الإجمالية 231.875 م2 والفتحات 231.875 م2. صافي الوجه.', '231.875', '231.875'),
        ]
        for text, gross, openings in cases:
            with self.subTest(text=text):
                proposal = call(gross, openings)
                original = copy.deepcopy(proposal)
                result = review(text, proposal)
                self.assertEqual(result['status'], 'consistent_evidence')
                self.assertEqual(proposal, original)
                self.assertFalse(result['authorization_granted'])
                self.assertFalse(result['calculation_executed'])
                for evidence in result['evidence'].values():
                    self.assertEqual(text[evidence['start']:evidence['end']], evidence['quote'])

    def test_wrong_but_contract_valid_proposals(self):
        text = 'Gross: 891.372 m2; openings: 62.418 m2. Net area.'
        for proposal in [call('891.373', '62.418'), call('891.372', '62.419'), call('953.79', '62.418')]:
            self.assertEqual(review(text, proposal)['reason'], 'proposal_source_value_mismatch')

    def test_ambiguity_is_review_not_permission(self):
        cases = [
            'Gross: 891.372 m2; openings: 62.418 m2; gross: 901.372 m2.',
            'Gross: 891.372 m2; revised gross: 901.372 m2; openings: 62.418 m2.',
            'Gross is not 891.372 m2; openings: 62.418 m2.',
            'Example: gross 891.372 m2; openings 62.418 m2.',
            'Gross: 891.372 m3; openings: 62.418 m2.',
            'Gross: 8.91372e2 m2; openings: 62.418 m2.',
            'Gross: 8,913.72 m2; openings: 62.418 m2.',
            'الإجمالي غير معلوم والفتحات 62.418 م².',
            'قيل "الإجمالي 891.372 م² والفتحات62.418 م²".',
            'إجمالي مساحة الفتحات 62.418 م². نحتاج الصافي.',
            'Gross: 891.372 m2; openings are unknown.',
            'الإجمالي 891.372 م² والفتحات سالب -62.418 م².',
            'الإجمالي 891.372 م² والفتحات سالب +62.418 م².',
        ]
        for text in cases:
            with self.subTest(text=text):
                result = review(text, call('891.372', '62.418'))
                self.assertEqual(result['status'], 'review_required')
                self.assertFalse(result['authorization_granted'])

    def test_negative_and_close_decimal_source_values(self):
        cases = [('Gross: 51.00001 m2; openings: 51.00002 m2.', call('51.00002', '51.00001')),
                 ('الإجمالي 891.372 م² والفتحات سالب 62.418 م².', call('891.372', '62.418'))]
        for text, proposal in cases:
            self.assertEqual(review(text, proposal)['reason'], 'invalid_explicit_source_values')

    def test_untrusted_json_and_out_of_scope_never_authorize(self):
        for proposal in ['{"action":"call","action":"clarify"}', 'NaN', [], call(True, 0),
                         dict(action='clarify', tool=None, arguments={}, missing_fields=['gross_m2']),
                         dict(action='call', tool='line_cost', arguments={}, missing_fields=[])]:
            result = review('Gross: 891.372 m2; openings: 62.418 m2.', proposal)
            self.assertFalse(result['authorization_granted'])
            self.assertFalse(result['calculation_executed'])


if __name__ == '__main__':
    unittest.main()
