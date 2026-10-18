import unittest
from calculator import calculate_explicit_inputs, parse_prediction


def call(tool, **arguments):
    return dict(action='call', tool=tool, arguments=arguments, missing_fields=[])


class CalculatorTests(unittest.TestCase):
    def test_reference_calculations(self):
        cases = [
            (call('rectangular_volume', length_m='6.85', width_m='2.45', height_m='0.175', count=6), '17.621625', 'm3'),
            (call('net_area', gross_m2='203.6', openings_m2='31.2'), '172.4', 'm2'),
            (call('add_waste', net_quantity='72.5', waste_percent='8', unit='m2'), '78.3', 'm2'),
            (call('line_cost', quantity='78.3', unit_price='65', quantity_unit='m2', price_unit='SAR/m2'), '5089.5', 'SAR'),
        ]
        for request, value, unit in cases:
            with self.subTest(tool=request['tool']):
                result = calculate_explicit_inputs(request)
                self.assertEqual((result['value'], result['unit']), (value, unit))
                self.assertFalse(result['text_grounding_verified'])

    def test_zero_boundaries(self):
        cases = [
            (call('net_area', gross_m2='65.2', openings_m2='65.2'), '0'),
            (call('net_area', gross_m2='65.2', openings_m2='0'), '65.2'),
            (call('add_waste', net_quantity='83.9', waste_percent='0', unit='m2'), '83.9'),
            (call('add_waste', net_quantity='0', waste_percent='8', unit='m2'), '0'),
            (call('line_cost', quantity='83.9', unit_price='0', quantity_unit='m2', price_unit='SAR/m2'), '0'),
        ]
        for request, value in cases:
            with self.subTest(request=request):
                self.assertEqual(calculate_explicit_inputs(request)['value'], value)

    def test_invalid_calls_never_execute(self):
        volume = dict(length_m='6', width_m='4', height_m='0.15', count=1)
        cases = [call('rectangular_volume', **dict(volume, height_m='0')),
                 call('rectangular_volume', **dict(volume, width_m=-4)),
                 call('rectangular_volume', **dict(volume, count=True)),
                 call('rectangular_volume', **dict(volume, count='1.5')),
                 call('rectangular_volume', **dict(volume, width_m='NaN')),
                 call('rectangular_volume', **dict(volume, width_m='Infinity')),
                 call('rectangular_volume', **dict(volume, width_m='1e1000000')),
                 call('rectangular_volume', **dict(volume, width_m='1e-1000000')),
                 call('net_area', gross_m2=4, openings_m2=5),
                 call('add_waste', net_quantity=10, waste_percent=-1, unit='m2'),
                 call('line_cost', quantity=10, quantity_unit='m2', price_unit='SAR/m2'),
                 call('line_cost', quantity=10, unit_price=5, quantity_unit='m3', price_unit='SAR/m2')]
        for request in cases:
            with self.subTest(request=request):
                result = calculate_explicit_inputs(request)
                self.assertEqual(result['status'], 'blocked')
                self.assertFalse(result['calculation_executed'])

    def test_clarification_stays_non_executable(self):
        request = dict(action='clarify', tool=None, arguments={}, missing_fields=['quantity', 'unit_price'])
        result = calculate_explicit_inputs(request)
        self.assertFalse(result['calculation_executed'])

    def test_strict_json(self):
        for raw in ['{"tool":"net_area","tool":"line_cost"}', '{"quantity":NaN}', '{"quantity":Infinity}']:
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                parse_prediction(raw)


if __name__ == '__main__':
    unittest.main()
