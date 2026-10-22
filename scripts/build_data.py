#!/usr/bin/env python3
"""Generate the browser catalog from primary-source transcriptions below.

See docs/catalog.md for evidence, geographic limits and editorial decisions.
Only run main explicitly: importing this module never changes generated files.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
from typing import Literal, TypedDict
from urllib.parse import urlsplit


class Source(TypedDict):
    title: str
    url: str
    region: str
    precision: str
    note: str


class BuyWindow(TypedDict):
    months: list[int]
    sources: list[str]
    note: str


class PlantWindow(BuyWindow):
    action: Literal['seedStart', 'directSow', 'transplant', 'sow']


class Crop(TypedDict):
    id: str
    name: str
    emoji: str
    category: str
    buy: BuyWindow | None
    plant: list[PlantWindow] | None


class Catalog(TypedDict):
    sources: dict[str, Source]
    crops: list[Crop]


ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCES: dict[str, Source] = {
    'central-autumn': {
        'title': 'Mercado Central: Frutas y hortalizas de estación',
        'url': 'https://mercadocentral.gob.ar/news/frutas-y-hortalizas-de-estaci%C3%B3n',
        'region': 'Mercado Central de Buenos Aires; market supply from multiple production regions',
        'precision': 'Autumn; editorial March-May bins, not exact trading dates',
        'note': 'Explicitly identifies zapallo, hinojo, manzana and pera as autumn arrivals. Preferred over the national seasonal list for these four crops. A seasonal recommendation, not an exhaustive availability calendar or evidence of local cultivation.',
    },
    'national-buy': {
        'title': 'Argentina: Las frutas y verduras de estación',
        'url': 'https://www.argentina.gob.ar/agricultura/mas-frutas-y-verduras/recomendaciones/las-frutas-y-verduras-de-estacion-son-las-mas-sabrosas-y-nutritivas',
        'region': 'Argentina; national produce supply, not Buenos Aires cultivation',
        'precision': 'Seasonal; editorial month bins, not exact availability dates',
        'note': 'Autumn-winter = March-August; spring = September-November; summer = December-February. Season membership is not exhaustive retail availability. National origins may supply Buenos Aires; no claim of local production.',
    },
    'city-autumn': {
        'title': 'Buenos Aires Ciudad: Huerta de otoño (17 March 2025)',
        'url': 'https://buenosaires.gob.ar/gcaba_historico/noticias/huerta-de-otono-consejos-y-recomendaciones-para-cultivar-productos-de',
        'region': 'Buenos Aires City; applicable reference for Belgrano',
        'precision': 'Autumn only; editorial March-May bins',
        'note': 'The article explicitly says sembrar but does not assign propagation methods or exact months. Conditions of soil and light qualify the recommendation. Broad coles is not assigned to specific brassicas.',
    },
    'gba-all-year': {
        'title': 'Buenos Aires Province: Cuaderno de huerta, Nivel Primario, page 6',
        'url': 'https://www.ambiente.gba.gob.ar/pdfs/008_CUADERNO%20DE%20HUERTA%20PRIMARIA_ABR24.pdf',
        'region': 'Buenos Aires Province; broad regional guidance, not a Belgrano site assessment',
        'precision': 'Explicit all-year planting statement',
        'note': 'PARA PLANTAR TODO EL AÑO lists acelga, zanahoria, rúcula and rabanitos. Method is not distinguished. Graphical seasonal calendar was not transcribed from text extraction.',
    },
    'inta-calendar': {
        'title': 'INTA: Calendario de siembra, spring-summer and autumn-winter tables',
        'url': 'https://www.argentina.gob.ar/sites/default/files/2023/08/script-tmp-inta_-calendario_de_siembra.pdf',
        'region': 'Argentina; PDF references INTA /bn but does not explicitly identify a geographic coverage area',
        'precision': 'Printed month ranges, not exact dates',
        'note': 'General INTA reference, not a verified Belgrano-specific calendar. Region and cultivar uncertainty apply. Almácigo maps to seedStart except batata, whose nursery material is unspecified and therefore omitted. Ambiguous punctuation-only ranges are omitted.',
    },
}

# Stable English IDs, display names and emoji are editorial labels, not source facts.
LABELS = {
 'olive': ('Olive', '🫒', 'fruit'),
 'chard': ('Swiss chard', '🥬', 'vegetable'),
 'chicory': ('Chicory', '🥬', 'vegetable'),
 'celery': ('Celery', '🥬', 'vegetable'),
 'sweet-potato': ('Sweet potato', '🍠', 'vegetable'),
 'watercress': ('Watercress', '🌿', 'vegetable'),
 'broccoli': ('Broccoli', '🥦', 'vegetable'),
 'cardoon': ('Cardoon', '🌿', 'vegetable'),
 'cauliflower': ('Cauliflower', '🥦', 'vegetable'),
 'scallion': ('Scallion', '🧅', 'vegetable'),
 'green-bean': ('Green bean', '🫘', 'vegetable'),
 'escarole': ('Escarole', '🥬', 'vegetable'),
 'spinach': ('Spinach', '🥬', 'vegetable'),
 'fennel': ('Fennel', '🌿', 'vegetable'),
 'turnip': ('Turnip', '🥕', 'vegetable'),
 'turnip-greens': ('Turnip greens', '🥬', 'vegetable'),
 'leek': ('Leek', '🥬', 'vegetable'),
 'radish': ('Radish', '🥕', 'vegetable'),
 'beet': ('Beet', '🥕', 'vegetable'),
 'cabbage': ('Cabbage', '🥬', 'vegetable'),
 'brussels-sprout': ('Brussels sprout', '🥬', 'vegetable'),
 'carrot': ('Carrot', '🥕', 'vegetable'),
 'winter-squash': ('Winter squash', '🎃', 'vegetable'),
 'banana': ('Banana', '🍌', 'fruit'),
 'plum': ('Plum', '🍑', 'fruit'),
 'peach': ('Peach', '🍑', 'fruit'),
 'lemon': ('Lemon', '🍋', 'fruit'),
 'mandarin': ('Mandarin', '🍊', 'fruit'),
 'melon': ('Melon', '🍈', 'fruit'),
 'quince': ('Quince', '🍐', 'fruit'),
 'orange': ('Orange', '🍊', 'fruit'),
 'avocado': ('Avocado', '🥑', 'fruit'),
 'nectarine': ('Nectarine', '🍑', 'fruit'),
 'pear': ('Pear', '🍐', 'fruit'),
 'grapefruit': ('Grapefruit', '🍊', 'fruit'),
 'summer-squash': ('Summer squash', '🥒', 'vegetable'),
 'parsley': ('Parsley', '🌿', 'herb'),
 'fava-bean': ('Fava bean', '🫘', 'vegetable'),
 'lettuce': ('Lettuce', '🥬', 'vegetable'),
 'artichoke': ('Artichoke', '🌿', 'vegetable'),
 'asparagus': ('Asparagus', '🌿', 'vegetable'),
 'strawberry': ('Strawberry', '🍓', 'fruit'),
 'raspberry': ('Raspberry', '🫐', 'fruit'),
 'cherry': ('Cherry', '🍒', 'fruit'),
 'blueberry': ('Blueberry', '🫐', 'fruit'),
 'apple': ('Apple', '🍎', 'fruit'),
 'pineapple': ('Pineapple', '🍍', 'fruit'),
 'tomato': ('Tomato', '🍅', 'vegetable'),
 'pepper': ('Bell pepper', '🫑', 'vegetable'),
 'onion': ('Onion', '🧅', 'vegetable'),
 'cucumber': ('Cucumber', '🥒', 'vegetable'),
 'eggplant': ('Eggplant', '🍆', 'vegetable'),
 'sweet-corn': ('Sweet corn', '🌽', 'vegetable'),
 'blackberry': ('Blackberry', '🫐', 'fruit'),
 'watermelon': ('Watermelon', '🍉', 'fruit'),
 'grape': ('Grape', '🍇', 'fruit'),
 'fig': ('Fig', '🫐', 'fruit'),
 'papaya': ('Papaya', '🍈', 'fruit'),
 'apricot': ('Apricot', '🍑', 'fruit'),
 'basil': ('Basil', '🌿', 'herb'),
 'garlic': ('Garlic', '🧄', 'vegetable'),
 'arugula': ('Arugula', '🥬', 'vegetable'),
 'peas': ('Peas', '🫛', 'vegetable'),
}

# National source headings; spelling variants and repeated fruit entries merge by ID.
# zapallo/calabaza -> winter-squash; achicoria/radicheta/radicha -> chicory.
BUY_ROWS = {
 'autumn-winter': 'olive chard chicory celery sweet-potato watercress broccoli cardoon cauliflower scallion green-bean escarole spinach fennel turnip turnip-greens leek radish beet cabbage brussels-sprout carrot winter-squash banana plum peach lemon mandarin melon quince orange avocado nectarine pear grapefruit',
 'spring': 'beet summer-squash chicory parsley leek fava-bean lettuce turnip-greens turnip chard celery artichoke asparagus strawberry raspberry cherry blueberry apple orange avocado pineapple banana lemon',
 'summer': 'winter-squash radish tomato asparagus pepper onion green-bean cucumber chard eggplant sweet-corn raspberry blackberry apple watermelon grape lemon nectarine pear blueberry strawberry fig papaya melon orange pineapple plum cherry apricot peach',
}
SEASONS = {
 'autumn-winter': [3, 4, 5, 6, 7, 8],
 'spring': [9, 10, 11],
 'summer': [12, 1, 2],
}
CITY_AUTUMN = 'onion radish beet carrot chard spinach lettuce parsley leek peas'.split()
ALL_YEAR = 'chard carrot arugula radish'.split()

# INTA pp. 1-2: only unambiguous explicitly dated method rows.
# Separate tuples preserve separate windows rather than filling intervening months.
INTA_ROWS: list[tuple[str, Literal['seedStart', 'directSow', 'transplant', 'sow'], list[int], str]] = [
 ('basil', 'seedStart', [8, 9], 'Albahaca: almácigo Ago-Set.'),
 ('basil', 'transplant', [10, 11], 'Albahaca: transplante Oct-Nov.'),
 ('sweet-potato', 'transplant', [10], 'Batata: transplante Oct.; nursery propagation not classified as seed starting.'),
 ('eggplant', 'seedStart', [8, 9], 'Berenjena: almácigo Ago-Set.'),
 ('eggplant', 'transplant', [10, 11], 'Berenjena: transplante Oct-Nov.'),
 ('winter-squash', 'directSow', [10, 11], 'Calabaza and zapallo: directa Oct-Nov.'),
 ('sweet-corn', 'directSow', [10, 11, 12], 'Maíz dulce: directa Oct-Dic.'),
 ('melon', 'directSow', [10], 'Melón: directa Oct.'),
 ('cucumber', 'directSow', [10], 'Pepino: directa Oct.'),
 ('pepper', 'seedStart', [7, 8], 'Pimiento: almácigo Jul-Ago.'),
 ('pepper', 'transplant', [10], 'Pimiento: transplante Oct.'),
 ('green-bean', 'directSow', [10, 11, 12, 1], 'Poroto chaucha: directa Oct-Ene.; window crosses the year boundary.'),
 ('tomato', 'seedStart', [9, 10], 'Tomate: almácigo Sep-Oct.'),
 ('tomato', 'transplant', [10, 11], 'Tomate: transplante Oct-Nov.'),
 ('summer-squash', 'directSow', [10, 11, 12, 1], 'Zapallito: directa Oct-Ene.; window crosses the year boundary.'),
 ('parsley', 'directSow', [9], 'Perejil: directa a chorrillo Setiembre.'),
 ('garlic', 'directSow', [3, 4], 'Ajo: directa Mar-Abr.; planting cloves, not seed starting.'),
 ('peas', 'directSow', [6, 7, 8], 'Arveja: directa Jun-Ago.; City separately supports unspecified autumn sowing.'),
 ('broccoli', 'seedStart', [2, 3], 'Brócoli: almácigo Feb-Mar.'),
 ('broccoli', 'transplant', [3, 4], 'Brócoli: transplante Mar-Abr.'),
 ('onion', 'seedStart', [3, 4], 'Cebolla bulbo: almácigo Mar-Abr.; no dated transplant row.'),
 ('onion', 'directSow', [4], 'Cebolla bulbo: directa Abr.'),
 ('scallion', 'seedStart', [2, 3, 4, 5, 6], 'Cebolla de verdeo: almácigo Feb-Jun.'),
 ('scallion', 'directSow', [3, 4, 5], 'Cebolla de verdeo: directa Mar-May.'),
 ('cauliflower', 'seedStart', [2, 3], 'Coliflor: almácigo Feb-Mar.'),
 ('cauliflower', 'transplant', [3, 4], 'Coliflor: transplante Mar-Abr.'),
 ('escarole', 'directSow', [2, 3], 'Escarola: directa Feb-Mar.'),
 ('chicory', 'directSow', [2, 3, 4, 5], 'Radicheta o Achicoria: directa a chorrillo Feb-May.; autumn-winter table.'),
 ('celery', 'seedStart', [9, 10, 11], 'Apio: almácigo Sept-Nov.; spring varieties Platense and Golden Boy, page 1.'),
 ('celery', 'transplant', [12, 1, 2, 3], 'Apio: transplante Dic-Mar.; spring varieties Platense and Golden Boy, page 1.'),
 ('celery', 'seedStart', [3], 'Apio: almácigo Marzo; autumn varieties Verde de Cortar and De Verdeo, page 1.'),
 ('celery', 'transplant', [5], 'Apio: transplante Mayo; autumn varieties Verde de Cortar and De Verdeo, page 1.'),
]

def build_catalog() -> Catalog:
    crops: dict[str, Crop] = {key: {'id': key, 'name': name, 'emoji': emoji, 'category': category, 'buy': None, 'plant': None}
             for key, (name, emoji, category) in LABELS.items()}
    for season, row in BUY_ROWS.items():
        for key in row.split():
            crop = crops[key]
            if crop['buy'] is None:
                crop['buy'] = {'months': [], 'sources': ['national-buy'], 'note': ''}
            crop['buy']['months'].extend(SEASONS[season])
    for crop in crops.values():
        if crop['buy'] is not None:
            crop['buy']['months'] = list(dict.fromkeys(crop['buy']['months']))
            crop['buy']['note'] = 'Coarse national seasonality, not an exhaustive Buenos Aires shop-availability calendar or evidence of local cultivation.'

    for key in ('winter-squash', 'fennel', 'apple', 'pear'):
        crops[key]['buy'] = {
            'months': [3, 4, 5], 'sources': ['central-autumn'],
            'note': 'Mercado Central explicitly names this crop as an autumn arrival. March-May are coarse editorial bins. Preferred over the broader national list; other months remain outside this recommendation, not proof of retail absence.',
        }

    def plant(key: str, action: Literal['seedStart', 'directSow', 'transplant', 'sow'], months: list[int], source: str, note: str):
        windows = crops[key]['plant']
        if windows is None:
            windows = []
            crops[key]['plant'] = windows
        windows.append({'action': action, 'months': months, 'sources': [source], 'note': note})

    for key in CITY_AUTUMN:
        if key not in ALL_YEAR:
            plant(key, 'sow', [3, 4, 5], 'city-autumn', 'Autumn sowing; March-May are coarse editorial bins. Source does not distinguish direct sowing from seed starting.')
    for key in ALL_YEAR:
        plant(key, 'sow', list(range(1, 13)), 'gba-all-year', 'Explicit all-year planting guidance; propagation method unspecified. Not an assertion that every cultivar suits every month.')
    for key, action, months, note in INTA_ROWS:
        plant(key, action, months, 'inta-calendar', note + ' INTA calendar coverage is not explicitly stated; use as a general regional reference, not a Belgrano-specific guarantee.')
    result: Catalog = {'sources': SOURCES, 'crops': sorted(crops.values(), key=lambda crop: crop['name'])}
    validate_catalog(result)
    return result

def validate_catalog(catalog):
    def require(condition, message):
        if not condition:
            raise ValueError(message)

    require(isinstance(catalog, dict) and set(catalog) == {'sources', 'crops'}, 'catalog shape')
    sources = catalog['sources']
    require(isinstance(sources, dict) and bool(sources), 'source registry')
    for key, source in sources.items():
        require(isinstance(key, str) and re.fullmatch(r'[a-z][a-z0-9]*(?:-[a-z0-9]+)*', key), 'source ID')
        require(isinstance(source, dict) and set(source) == {'title', 'url', 'region', 'precision', 'note'}, 'source shape')
        require(all(isinstance(value, str) and value.strip() for value in source.values()), 'source metadata')
        try:
            parsed_url = urlsplit(source['url'])
            _ = parsed_url.port
            valid_url = (parsed_url.scheme == 'https' and bool(parsed_url.netloc) and
                         bool(parsed_url.hostname) and not any(char.isspace() for char in parsed_url.netloc))
        except ValueError:
            valid_url = False
        require(valid_url, 'source URL')
    require(isinstance(catalog['crops'], list) and bool(catalog['crops']), 'crop list')
    ids = set()
    for crop in catalog['crops']:
        require(isinstance(crop, dict) and set(crop) == {'id', 'name', 'emoji', 'category', 'buy', 'plant'}, 'crop shape')
        key = crop['id']
        require(isinstance(key, str) and re.fullmatch(r'[a-z][a-z0-9]*(?:-[a-z0-9]+)*', key), 'crop ID')
        require(key not in ids, 'duplicate crop ID')
        ids.add(key)
        require(all(isinstance(crop[field], str) and crop[field].strip() for field in ('name', 'emoji')), 'crop labels')
        require(crop['category'] in ('vegetable', 'fruit', 'herb'), 'crop category')
        require(crop['buy'] is None or isinstance(crop['buy'], dict), 'buy shape')
        require(crop['plant'] is None or (isinstance(crop['plant'], list) and bool(crop['plant'])), 'plant shape')
        windows = [] if crop['buy'] is None else [(crop['buy'], False)]
        if crop['plant'] is not None:
            windows += [(window, True) for window in crop['plant']]
        for window, planting in windows:
            fields = {'months', 'sources', 'note'} | ({'action'} if planting else set())
            require(isinstance(window, dict) and set(window) == fields, 'window shape')
            months = window['months']
            require(isinstance(months, list) and bool(months), 'empty months are not unknown')
            require(all(type(month) is int and 1 <= month <= 12 for month in months), 'month must be integer 1..12')
            require(len(months) == len(set(months)), 'duplicate month')
            refs = window['sources']
            require(isinstance(refs, list) and bool(refs), 'window sources')
            require(all(isinstance(ref, str) and ref in sources for ref in refs), 'unknown source reference')
            require(len(refs) == len(set(refs)), 'duplicate source reference')
            require(isinstance(window['note'], str) and bool(window['note'].strip()), 'window evidence note')
            if planting:
                require(window['action'] in ('seedStart', 'directSow', 'transplant', 'sow'), 'plant action')

def render(catalog):
    return ('// Generated by scripts/build_data.py; do not edit. See docs/catalog.md.\n'
            + 'window.SOURCES = ' + json.dumps(catalog['sources'], ensure_ascii=False, indent=2) + ';\n'
            + 'window.CROPS = ' + json.dumps(catalog['crops'], ensure_ascii=False, indent=2) + ';\n')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='fail if generated output is stale')
    args = parser.parse_args()
    catalog = build_catalog()
    output = ROOT / 'data' / 'crops-v2.js'
    text = render(catalog)
    if args.check:
        if not output.exists() or output.read_text(encoding='utf-8') != text:
            parser.exit(1, 'data/crops-v2.js is stale; run python3 scripts/build_data.py\n')
    else:
        output.write_text(text, encoding='utf-8')
    crops = catalog['crops']
    print(json.dumps(dict(crops=len(crops), sources=len(SOURCES),
        categories={category: sum(c['category'] == category for c in crops) for category in ('vegetable', 'fruit', 'herb')},
        buy=sum(c['buy'] is not None for c in crops), plant=sum(c['plant'] is not None for c in crops),
        buyOnly=sum(c['buy'] is not None and c['plant'] is None for c in crops),
        plantOnly=sum(c['buy'] is None and c['plant'] is not None for c in crops)), sort_keys=True))

if __name__ == '__main__':
    main()