# Importa la hoja de Pokémon y objetos (exportada de Google Sheets como .xlsx) al
# contenido de la web: un JSON por fila en src/content/ y las imágenes,
# recortadas y en webp, en public/.
#
# Se usó una vez para pasar del Excel a la web. Desde entonces el contenido se
# edita en el panel, así que volver a ejecutarlo PISA lo que se haya cambiado
# allí. Solo tiene sentido si se vuelve a mantener el Excel como origen.
#
#   python3 -m venv .venv && .venv/bin/pip install openpyxl pillow
#   .venv/bin/python scripts/import-excel.py "ruta/al/Pokemon_Item List.xlsx"
#
# Lo que NO se importa, a propósito:
#   - Los nombres de los propietarios (columna OWNER). Se decidió publicarlos
#     después: los copia scripts/import-owners.py, que solo toca ese campo.
#   - Las pestañas FINDER (son filtros, que ahora hace la propia página) y
#     VALUES (son las opciones de los desplegables del panel).
#   - Las columnas de tipo con VLOOKUP, que solo repetían el tipo con su icono.

import io
import json
import re
import shutil
import sys
import unicodedata
from pathlib import Path

import openpyxl
from PIL import Image


ROOT = Path(__file__).resolve().parent.parent

# Lado máximo de las imágenes. En la tabla se ven a 48-64px; el doble cubre las
# pantallas de alta densidad sin cargar los PNG de 512px del Excel.
SPRITE_EDGE = 128
ICON_EDGE = 64


def slug(text):

    text = unicodedata.normalize("NFD", text or "")
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")

    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def clean(value):

    # Las celdas multilínea se escribieron así para que cupieran en la columna,
    # no porque el salto signifique algo.
    if value is None:
        return ""

    return re.sub(r"\s+", " ", str(value)).strip()


def split_name(value):

    # "Corsola \n(Galarian)" -> ("Corsola", "Galarian"). Solo cuenta el último
    # paréntesis: "Strange Mask(s) (Ogerpon)" -> ("Strange Mask(s)", "Ogerpon").
    text = clean(value)
    match = re.match(r"^(.*?)\s*\(([^()]*)\)\s*$", text)

    if match:
        return match.group(1).strip(), match.group(2).strip()

    return text, ""


def price(value):

    text = clean(value)

    if not text or text == "-":
        return None

    return int(float(text))


def images_by_row(sheet, column):

    # Las imágenes del Excel flotan sobre la hoja; la celda en la que está
    # anclada su esquina es la fila a la que pertenecen.
    return {
        image.anchor._from.row + 1: image._data()
        for image in sheet._images
        if image.anchor._from.col == column - 1
    }


def save_image(data, path, edge):

    path.parent.mkdir(parents=True, exist_ok=True)

    image = Image.open(io.BytesIO(data))
    image.thumbnail((edge, edge))

    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGBA")

    image.save(path, "WEBP", quality=82, method=6)


def unique(base, taken, suffix):

    # Dos filas pueden llamarse igual (la bendición y la pertenencia de
    # Rayquaza): la segunda se distingue con el sufijo.
    name = base if base not in taken else f"{base}-{slug(suffix)}"
    taken.add(name)

    return name


def reset(*folders):

    for folder in folders:
        shutil.rmtree(folder, ignore_errors=True)
        folder.mkdir(parents=True)


def write(folder, name, data):

    (folder / f"{name}.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )


def import_types(sheet, column_name, column_image, folder):

    icons = images_by_row(sheet, column_image)

    for row, data in icons.items():

        name = clean(sheet.cell(row, column_name).value)

        if name and name != "None":
            save_image(data, folder / f"{slug(name)}.webp", ICON_EDGE)


def import_pokemon(book):

    content = ROOT / "src/content/pokemon"
    media = ROOT / "public/pokemon"
    reset(content, media)

    taken = set()

    # Las dos hojas comparten casi todas las columnas; los Fakemon cambian la
    # generación por el creador y no tienen clasificación.
    sheets = [
        (book["POKEMON LIST"], False),
        (book["FAKEMON LIST"], True)
    ]

    count = 0

    for sheet, fakemon in sheets:

        images = images_by_row(sheet, 4)
        order = None

        for row in range(4, sheet.max_row + 1):

            # El ID es una fórmula (=B4+1, o -1 en los Fakemon), así que se
            # vuelve a contar aquí. Es a la vez el número de fila y el número
            # del Pokémon: las formas (Corsola y Corsola de Galar) van seguidas.
            order = (-1 if fakemon else 1) if order is None else order + (-1 if fakemon else 1)

            name, form = split_name(sheet.cell(row, 3).value)

            if not name:
                continue

            owner = clean(sheet.cell(row, 7).value)
            fused = clean(sheet.cell(row, 8).value)
            stage = clean(sheet.cell(row, 14).value)

            entry = {
                "order": order,
                "name": name,
                "form": form,
                "image": "",
                "status": clean(sheet.cell(row, 5).value),
                "generation": None,
                "type1": clean(sheet.cell(row, 10).value),
                "type2": clean(sheet.cell(row, 11).value).replace("None", ""),
                "lineStatus": clean(sheet.cell(row, 9).value).replace("EVOUTION", "EVOLUTION"),
                "stage": re.sub(r"\s*//\s*", " // ", stage),
                "classification": "",
                "claimed": bool(owner),
                "npc": owner.upper().startswith("NPC"),
                "fusedWith": "" if fused == "N/A" else fused,
                "fakemon": fakemon
            }

            if fakemon:
                entry["creator"] = clean(sheet.cell(row, 6).value)
            else:
                generation = re.search(r"\d+", clean(sheet.cell(row, 6).value))
                entry["generation"] = int(generation.group()) if generation else None
                entry["classification"] = clean(sheet.cell(row, 15).value)

            file = unique(slug(name), taken, form or "fakemon")

            if row in images:
                save_image(images[row], media / f"{file}.webp", SPRITE_EDGE)
                entry["image"] = f"/pokemon/{file}.webp"

            write(content, file, entry)
            count += 1

    import_types(book["POKEMON LIST"], 17, 18, ROOT / "public/types")

    return count


# Las pertenencias especiales y las bendiciones están en la misma hoja que el
# resto de objetos, pero en la web tienen página (y colección del panel) propia:
# no se compran, no se venden y casi todas van ligadas a un Pokémon.
SECTIONS = {
    "SPECIAL BELONGING": "belongings",
    "BLESSING": "blessings"
}


def import_items(book):

    sheet = book["ITEM LIST"]

    folders = {
        section: (ROOT / f"src/content/{section}", ROOT / f"public/{section}")
        for section in ["items", *SECTIONS.values()]
    }

    for content, media in folders.values():
        reset(content, media)

    images = images_by_row(sheet, 2)
    taken = {section: set() for section in folders}
    counts = {section: 0 for section in folders}

    for row in range(4, sheet.max_row + 1):

        name, note = split_name(sheet.cell(row, 3).value)

        if not name:
            continue

        kind = clean(sheet.cell(row, 4).value)
        section = SECTIONS.get(kind, "items")
        how = clean(sheet.cell(row, 12).value)
        description = clean(sheet.cell(row, 7).value)

        cells = [
            clean(sheet.cell(row, column).value)
            for column in range(13, 18)
        ]
        cells = [cell for cell in cells if cell and cell != "None"]

        if section == "belongings":

            # El paréntesis es el Pokémon al que pertenece ("Energy Cell
            # (Zapdos)"). Las que aún no tienen objeto se llaman como él.
            entry = {
                "name": name,
                "pokemon": note,
                "image": "",
                "rarity": clean(sheet.cell(row, 5).value),
                "description": description,
                "locations": cells
            }

        elif section == "blessings":

            # La bendición venía al final de la descripción: "(Gives Sky
            # Blessing)". El paréntesis del nombre solo repetía "Blessing".
            gives = re.search(r"\(\s*Gives\s+(.*?)\s*\)\s*$", description, re.I)

            entry = {
                "name": name,
                "image": "",
                "blessing": gives.group(1) if gives else "",
                "description": description[:gives.start()].strip() if gives else description
            }

        else:

            entry = {
                "name": name,
                "note": note,
                "image": "",
                "type": kind,
                "rarity": clean(sheet.cell(row, 5).value),
                "description": description,
                "buy": price(sheet.cell(row, 9).value),
                "sell": price(sheet.cell(row, 10).value),
                "howToGet": how,
                "locations": [],
                "ingredients": []
            }

            # Al fabricar, las columnas son ingredientes con cantidad
            # ("IRON BALL x1"); en el resto, lugares o instrucciones.
            for cell in cells:

                match = re.match(r"^(.*?)\s*x(\d+)$", cell, re.I)

                if how == "CRAFT" and match:
                    entry["ingredients"].append({
                        "item": match.group(1).strip(),
                        "quantity": int(match.group(2))
                    })
                else:
                    entry["locations"].append(cell)

        content, media = folders[section]
        file = unique(slug(name), taken[section], note or kind)

        if row in images:
            save_image(images[row], media / f"{file}.webp", SPRITE_EDGE)
            entry["image"] = f"/{section}/{file}.webp"

        write(content, file, entry)
        counts[section] += 1

    import_types(sheet, 19, 20, ROOT / "public/rarity")

    return counts


def main():

    if len(sys.argv) != 2:
        sys.exit("Uso: import-excel.py <archivo.xlsx>")

    book = openpyxl.load_workbook(sys.argv[1])

    print(f"Pokémon: {import_pokemon(book)}")

    for section, count in import_items(book).items():
        print(f"{section}: {count}")


if __name__ == "__main__":
    main()
