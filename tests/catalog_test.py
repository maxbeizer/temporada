import copy
import importlib.util
import pathlib
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location('build_data', ROOT / 'scripts/build_data.py')
assert SPEC is not None and SPEC.loader is not None
build_data = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(build_data)


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.catalog = copy.deepcopy(build_data.build_catalog())
        self.crops = {crop['id']: crop for crop in self.catalog['crops']}

    def test_generated_output_is_current(self):
        self.assertEqual((ROOT / 'data/crops-v2.js').read_text(), build_data.render(self.catalog))

    def test_browser_exports_execute(self):
        result = subprocess.run(['node', '-e', "const fs=require('node:fs'),vm=require('node:vm');const ctx={window:{}};vm.runInNewContext(fs.readFileSync('data/crops-v2.js','utf8'),ctx);process.stdout.write(JSON.stringify({sources:ctx.window.SOURCES,crops:ctx.window.CROPS}));"], cwd=ROOT, text=True, capture_output=True, check=True)
        import json
        self.assertEqual(json.loads(result.stdout), self.catalog)

    def test_unknown_is_independent(self):
        self.assertIsNone(self.crops['apple']['plant'])
        self.assertIsNotNone(self.crops['apple']['buy'])
        self.assertIsNone(self.crops['basil']['buy'])
        self.assertIsNotNone(self.crops['basil']['plant'])

    def test_explicit_all_year(self):
        self.assertEqual(self.crops['arugula']['plant'][0]['months'], list(range(1, 13)))
        self.assertEqual(self.crops['arugula']['plant'][0]['action'], 'sow')

    def test_year_boundary_is_not_filled_or_sorted(self):
        window = self.crops['green-bean']['plant'][0]
        self.assertEqual(window['months'], [10, 11, 12, 1])
        self.assertNotIn(2, window['months'])
        self.assertEqual(self.crops['tomato']['buy']['months'], [12, 1, 2])

    def test_multiple_windows_preserve_gap(self):
        crop = self.crops['basil']
        crop['plant'].append(dict(action='seedStart', months=[2, 3], sources=['inta-calendar'], note='Synthetic validator fixture, not production evidence.'))
        build_data.validate_catalog(self.catalog)
        windows = [w['months'] for w in crop['plant'] if w['action'] == 'seedStart']
        self.assertEqual(windows, [[8, 9], [2, 3]])
        self.assertFalse(any(5 in months for months in windows))

    def test_empty_plant_is_rejected(self):
        self.crops['apple']['plant'] = []
        with self.assertRaises(ValueError):
            build_data.validate_catalog(self.catalog)
        self.assertFalse(any(crop['plant'] == [] for crop in build_data.build_catalog()['crops']))

    def test_explicit_inta_chicory_and_celery_windows(self):
        self.assertEqual(
            [(w['action'], w['months']) for w in self.crops['chicory']['plant']],
            [('directSow', [2, 3, 4, 5])],
        )
        self.assertEqual(
            [(w['action'], w['months']) for w in self.crops['celery']['plant']],
            [('seedStart', [9, 10, 11]), ('transplant', [12, 1, 2, 3]),
             ('seedStart', [3]), ('transplant', [5])],
        )
        for key in ('chicory', 'celery'):
            for window in self.crops[key]['plant']:
                self.assertEqual(window['sources'], ['inta-calendar'])
                self.assertIn('coverage is not explicitly stated', window['note'])

    def test_explicit_inta_parsley_window(self):
        self.assertIn(
            ('directSow', [9]),
            [(window['action'], window['months']) for window in self.crops['parsley']['plant']],
        )

    def test_market_precedence(self):
        for key in ('winter-squash', 'fennel', 'apple', 'pear'):
            self.assertEqual(self.crops[key]['buy']['months'], [3, 4, 5])
            self.assertEqual(self.crops[key]['buy']['sources'], ['central-autumn'])

    def test_invalid_ids_shapes_and_references(self):
        mutations = [
            lambda c: c['crops'].append(copy.deepcopy(c['crops'][0])),
            lambda c: c['crops'][0].update(id='Bad ID'),
            lambda c: c['crops'][0].update(category='tree'),
            lambda c: c['crops'][0].pop('plant'),
            lambda c: c['crops'][0].update(buy=[]),
            lambda c: c['crops'][0].update(plant={}),
            lambda c: c['sources']['national-buy'].pop('region'),
            lambda c: c['sources']['national-buy'].update(url='http://example.com'),
        ]
        for mutate in mutations:
            with self.subTest(mutate=mutate):
                catalog = copy.deepcopy(self.catalog)
                mutate(catalog)
                with self.assertRaises(ValueError):
                    build_data.validate_catalog(catalog)

    def test_invalid_windows(self):
        for field, value in [('months', []), ('months', [0]), ('months', [13]), ('months', [True]), ('months', [1.5]), ('months', ['1']), ('months', [1, 1]), ('months', None), ('sources', []), ('sources', ['missing']), ('sources', ['inta-calendar', 'inta-calendar']), ('note', ''), ('action', 'harvest')]:
            with self.subTest(field=field, value=value):
                catalog = copy.deepcopy(self.catalog)
                crop = next(c for c in catalog['crops'] if c['id'] == 'basil')
                crop['plant'][0][field] = value
                with self.assertRaises(ValueError):
                    build_data.validate_catalog(catalog)

    def test_invalid_https_source_urls(self):
        for value in ('https://', 'https:// bad', 'https://?x', 'https://example.com:bad', 'https://example.com:99999'):
            with self.subTest(value=value):
                catalog = copy.deepcopy(self.catalog)
                catalog['sources']['national-buy']['url'] = value
                with self.assertRaises(ValueError):
                    build_data.validate_catalog(catalog)


if __name__ == '__main__':
    unittest.main()
