# Copia los propietarios de los Pokémon (columna OWNER del Excel) a los JSON de
# src/content/pokemon/, en el campo `owner`. No toca nada más: lo editado en el
# panel se queda como está.
#
# Se hizo aparte de import-excel.py porque aquel lo vuelve a escribir todo. Este
# reconoce cada fila con el mismo nombre de archivo que le dio aquel (mismo
# orden de hojas, mismo slug y mismo sufijo para los repetidos).
#
#   .venv/bin/python scripts/import-owners.py "ruta/al/Pokemon_Item List.xlsx"
#
# La celda viene en varias líneas: un "NPC" opcional delante, el usuario y un
# "NOT ADDED" opcional detrás. Se guarda solo el usuario; lo de NPC ya tiene su
# propia casilla. Solo se escribe en los Pokémon que siguen marcados como
# reclamados o de NPC: si en el panel se desmarcó uno, el Excel no lo pisa.

import importlib.util
import json
import sys
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "src/content/pokemon"

# import-excel.py tiene guion en el nombre, así que no se puede importar con
# `import`; se carga a mano para usar exactamente sus mismas funciones.
spec = importlib.util.spec_from_file_location("import_excel", ROOT / "scripts/import-excel.py")
excel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(excel)

MARKERS = {"NPC", "NOT ADDED"}


def owner_of(value):

    lines = [line.strip() for line in str(value or "").splitlines()]

    return " ".join(line for line in lines if line and line.upper() not in MARKERS)


# Mete `owner` justo detrás de `npc`, para que el JSON siga leyéndose en orden.
def with_owner(entry, owner):

    result = {key: value for key, value in entry.items() if key != "owner"}
    keys = list(result)
    at = keys.index("npc") + 1 if "npc" in keys else len(keys)

    items = list(result.items())
    items.insert(at, ("owner", owner))

    return dict(items)


def main():

    if len(sys.argv) != 2:
        sys.exit("Uso: import-owners.py <archivo.xlsx>")

    book = openpyxl.load_workbook(sys.argv[1], read_only=True)

    taken = set()
    written = skipped = 0
    problems = []

    for sheet_name, fakemon in [("POKEMON LIST", False), ("FAKEMON LIST", True)]:

        sheet = book[sheet_name]

        for row in sheet.iter_rows(min_row=4, max_col=7, values_only=True):

            name, form = excel.split_name(row[2])

            if not name:
                continue

            file = excel.unique(excel.slug(name), taken, form or "fakemon")
            path = CONTENT / f"{file}.json"
            owner = owner_of(row[6])

            if not path.exists():
                if owner:
                    problems.append(f"{file}: no JSON (renamed or deleted in the panel?), owner {owner}")
                continue

            entry = json.loads(path.read_text(encoding="utf-8"))

            if (entry.get("name"), entry.get("form", "")) != (name, form):
                problems.append(f"{file}: the JSON is {entry.get('name')} {entry.get('form')}, the sheet says {name} {form}")
                continue

            if owner and not (entry.get("claimed") or entry.get("npc")):
                problems.append(f"{file}: not claimed in the panel, owner {owner} left out")
                owner = ""

            # Sin propietario no hace falta el campo: la web lo trata como vacío,
            # y así no cambian los mil JSON que no tienen.
            updated = with_owner(entry, owner) if owner or "owner" in entry else entry

            if updated == entry:
                skipped += 1
                continue

            path.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            written += 1

    print(f"Written: {written} · unchanged: {skipped}")

    for problem in problems:
        print(f"  ! {problem}")


if __name__ == "__main__":
    main()
