#!/usr/bin/env python3
"""Build data/produce.js from the source lists below.

Source A (monthly): InfoAgro / inspiracioneco calendar, republished by
AgroRuralNoticias 2020-07-18, "recabadas de documentos públicos del INTA".
The page lists each month once per pass and repeats Dec, Mar and Jun at the
season turnovers; repeated months are merged (union).
Source B (seasonal): argentina.gob.ar, Más Frutas y Verduras, "Las frutas y
verduras de estación..." and "Cuatro estaciones" (otoño). Seasons are mapped to
months coarsely: otoño Mar-May, invierno Jun-Aug, primavera Sep-Nov,
verano Dec-Feb. Used only for items absent from Source A.
"""
import json, pathlib

M = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]

# Source A: month -> (vegetables, fruits), as printed. Merged duplicates are listed once per month.
A = {
 "sep": ("acelga alcaucil arveja calabaza chaucha espinaca haba choclo lechuga escarola pepino puerro remolacha zanahoria zapallito rabanito radicheta",
         "frutilla limón manzana naranja palta tomate mandarina membrillo pomelo"),
 "oct": ("acelga alcaucil arveja calabaza chaucha haba choclo lechuga escarola pepino puerro rúcula remolacha zanahoria zapallito", "frutilla limón manzana naranja palta tomate"),
 "nov": ("acelga alcaucil arveja calabaza cebolla cebolla_de_verdeo haba lechuga escarola pepino perejil rúcula remolacha zanahoria zapallito", "frutilla limón manzana naranja palta tomate"),
 "dic": ("acelga alcaucil ajo albahaca arveja calabaza cebolla cebolla_de_verdeo chaucha haba lechuga escarola pepino perejil puerro rúcula remolacha zanahoria zapallito choclo",
         "ciruela cereza damasco durazno frutilla higo manzana melón naranja pera sandía tomate uva"),
 "ene": ("acelga ajo albahaca arveja cebolla cebolla_de_verdeo choclo chaucha lechuga escarola pepino perejil puerro rabanito radicheta remolacha rúcula zanahoria zapallito",
         "ciruela cereza damasco durazno frutilla higo manzana melón naranja pera sandía tomate uva"),
 "feb": ("acelga ajo albahaca berenjena cebolla cebolla_de_verdeo choclo chaucha lechuga escarola pepino pimiento puerro rabanito radicheta remolacha zanahoria zapallito",
         "ciruela cereza damasco durazno frutilla higo manzana melón naranja pera sandía tomate uva"),
 "mar": ("acelga ajo albahaca berenjena chaucha choclo lechuga escarola pepino pimiento rabanito radicheta remolacha zanahoria zapallito",
         "ciruela cereza damasco durazno frutilla higo manzana melón naranja pera sandía tomate uva kiwi limón mandarina membrillo palta pomelo"),
 "abr": ("acelga berenjena chaucha choclo lechuga escarola pepino perejil pimiento rabanito radicheta remolacha zanahoria zapallito", "kiwi limón mandarina manzana membrillo naranja palta pomelo"),
 "may": ("acelga apio berenjena choclo espinaca lechuga escarola pepino puerro rabanito radicheta remolacha zanahoria zapallito", "kiwi limón mandarina manzana membrillo naranja palta pomelo"),
 "jun": ("acelga apio chaucha choclo espinaca lechuga escarola pepino perejil puerro rabanito radicheta remolacha zanahoria zapallito", "kiwi limón mandarina manzana membrillo naranja palta pomelo"),
 "jul": ("acelga apio arveja chaucha espinaca lechuga escarola puerro rabanito radicheta", "limón mandarina manzana membrillo naranja palta pomelo"),
 "ago": ("acelga apio arveja chaucha espinaca lechuga escarola puerro rabanito radicheta", "limón mandarina manzana membrillo naranja palta pomelo"),
}
# Source A is silent on tomate's category: it prints it with fruit. Treat as vegetable.
FRUIT_AS_VEG = {"tomate"}

SEASON = {"otoño": [2,3,4], "invierno": [5,6,7], "primavera": [8,9,10], "verano": [11,0,1]}
# Source B, only items not covered by Source A: name -> (type, seasons)
B = {
 "batata": ("veg", ["otoño","invierno"]), "berro": ("veg", ["otoño","invierno"]),
 "brócoli": ("veg", ["otoño","invierno"]), "cardo": ("veg", ["otoño","invierno"]),
 "coliflor": ("veg", ["otoño","invierno"]), "hinojo": ("veg", ["otoño","invierno"]),
 "nabo": ("veg", ["otoño","invierno"]), "repollo": ("veg", ["otoño","invierno"]),
 "repollitos_de_bruselas": ("veg", ["otoño","invierno"]),
 "zapallo": ("veg", ["otoño","invierno","verano"]),
 "espárrago": ("veg", ["primavera","verano"]),
 "frambuesa": ("fruit", ["primavera","verano"]), "arándano": ("fruit", ["primavera","verano"]),
 "mora": ("fruit", ["verano"]), "pelón": ("fruit", ["otoño","invierno","verano"]),
 "granada": ("fruit", ["otoño"]), "caqui": ("fruit", ["otoño"]),
}

EN = {
 "acelga":"Swiss chard","alcaucil":"Artichoke","arveja":"Peas","calabaza":"Pumpkin / squash","chaucha":"Green beans",
 "espinaca":"Spinach","haba":"Fava beans","choclo":"Sweet corn","lechuga":"Lettuce","escarola":"Escarole",
 "pepino":"Cucumber","puerro":"Leek","remolacha":"Beet","zanahoria":"Carrot","zapallito":"Small round squash / zucchini",
 "rabanito":"Radish","radicheta":"Radicchio / chicory","rúcula":"Arugula","cebolla":"Onion","cebolla de verdeo":"Scallion",
 "perejil":"Parsley","ajo":"Garlic","albahaca":"Basil","berenjena":"Eggplant","pimiento":"Bell pepper (morrón)",
 "apio":"Celery","tomate":"Tomato","batata":"Sweet potato","berro":"Watercress","brócoli":"Broccoli","cardo":"Cardoon",
 "coliflor":"Cauliflower","hinojo":"Fennel","nabo":"Turnip","repollo":"Cabbage","repollitos de bruselas":"Brussels sprouts",
 "zapallo":"Winter squash","espárrago":"Asparagus",
 "frutilla":"Strawberry","limón":"Lemon","manzana":"Apple","naranja":"Orange","palta":"Avocado","mandarina":"Mandarin",
 "membrillo":"Quince","pomelo":"Grapefruit","ciruela":"Plum","cereza":"Cherry","damasco":"Apricot","durazno":"Peach",
 "higo":"Fig","melón":"Melon","pera":"Pear","sandía":"Watermelon","uva":"Grape","kiwi":"Kiwi","frambuesa":"Raspberry",
 "arándano":"Blueberry","mora":"Blackberry","pelón":"Nectarine","granada":"Pomegranate","caqui":"Persimmon",
}
SRC_A = "A"; SRC_B = "B"

items = {}
def add(name, typ, months, src):
    it = items.setdefault(name, {"es": name, "type": typ, "months": [0]*12, "src": src})
    for i in months: it["months"][i] = 1

for m, (veg, fruit) in A.items():
    i = M.index(m)
    for n in veg.split():
        add(n.replace("_"," "), "veg", [i], SRC_A)
    for n in fruit.split():
        add(n, "veg" if n in FRUIT_AS_VEG else "fruit", [i], SRC_A)
for n, (typ, seasons) in B.items():
    n = n.replace("_"," ")
    assert n not in items, n
    add(n, typ, [i for s in seasons for i in SEASON[s]], SRC_B)

out = []
for n, it in items.items():
    it["es"] = n[0].upper()+n[1:]
    it["en"] = EN[n]
    out.append(it)
out.sort(key=lambda x: (x["type"], x["es"].lower()))
root = pathlib.Path(__file__).resolve().parent.parent
(root/"data"/"produce.js").write_text("window.PRODUCE = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
print(len(out), "items;", sum(1 for x in out if x["type"]=="veg"), "veg,", sum(1 for x in out if x["type"]=="fruit"), "fruit")
