import { Link, useParams } from "react-router-dom";

import islands from "../data/islands";
import pokemon from "../data/pokemon";
import { regionName } from "../data/region";
import ContentBlock from "../components/ContentBlock";
import ContentToc from "../components/ContentToc";
import NotFound from "./NotFound";
import useDocumentTitle from "../lib/useDocumentTitle";
import usePageAccent from "../lib/usePageAccent";
import withBlockIds from "../lib/blocks";


// Quita las filas a medio rellenar del panel (sin nombre ni imagen).
function filled(entries){

    return (entries ?? []).filter(
        entry => entry?.name?.trim() || entry?.image?.trim()
    );

}


// Las secciones de una isla, en este orden: su historia, sus territorios (cada
// uno con un carrusel de zonas seguras y otro de dungeons), sus NPCs y los
// personajes relacionados con ella.
//
// No se escriben como bloques libres en el panel —cada isla tiene siempre las
// mismas—, pero se pintan con los mismos bloques y carruseles que las fichas de
// país y de facción. Una sección vacía no sale, ni en la página ni en el índice.
function islandBlocks(island){

    const blocks = [];


    // Los legendarios ligados a la isla se eligen en el panel de la lista de
    // Pokémon, así que aquí llegan sus ids ("lugia") y se busca su nombre y su
    // imagen. Uno que ya no exista (renombrado o borrado) se salta.
    const legendaries = (island.legendaries ?? [])
        .map(id => pokemon.find(entry => entry.id === id))
        .filter(Boolean)
        .map(entry => ({
            // Debajo solo cabe el nombre; la forma ("+ Walking Wake") sale al
            // posar el ratón.
            name: entry.name,
            tooltip: [entry.name, entry.form].filter(part => part?.trim()).join(" "),
            image: entry.image
        }));

    if(island.description?.trim() || legendaries.length > 0){

        blocks.push({
            title: "History",
            parts: [
                { type: "text", text: island.description },
                { type: "thumbs", title: "Related legendaries", items: legendaries }
            ]
        });

    }


    const territories = (island.territories ?? []).filter(
        territory => territory?.name?.trim()
    );

    if(territories.length > 0){

        blocks.push({
            title: "Locations",
            parts: territories.flatMap(territory => [
                { type: "text", title: territory.name, text: territory.description },
                {
                    type: "regions",
                    regions: [
                        { title: "Safe zones", locations: filled(territory.safeZones) },
                        { title: "Dungeons", locations: filled(territory.dungeons) }
                    ].filter(region => region.locations.length > 0)
                }
            ])
        });

    }


    const npcs = filled(island.npcs);

    if(npcs.length > 0){

        blocks.push({
            title: "NPCs",
            parts: [{ type: "characters", groups: [{ characters: npcs }] }]
        });

    }


    const characters = filled(island.characters);

    if(characters.length > 0){

        blocks.push({
            title: "Characters",
            parts: [{ type: "characters", groups: [{ characters }] }]
        });

    }


    return withBlockIds(blocks);

}


// La ficha de una isla: título, índice y sus secciones.
export default function Island(){

    const { islandId } = useParams();

    const island = islands.find(entry => entry.id === islandId);

    // Mismo texto que el <NotFound> de abajo, o el título de la pestaña se
    // pisaría (ver useDocumentTitle).
    useDocumentTitle(island?.name ?? "Island not found");

    // Como en los dioses de PU-Web: mientras estás en la isla, el fondo de la
    // página es su arte y el marco y el título toman su color. Sin fondo propio
    // se usa la imagen de la tarjeta.
    //
    // Una isla en construcción no tiene página todavía, así que tampoco cambia
    // el fondo.
    const open = island && !island.underConstruction;

    usePageAccent(
        open ? island.background?.trim() || island.image : undefined,
        open ? island.color?.trim() : undefined
    );


    if(!island){

        return <NotFound title="Island not found" />;

    }


    // Alguien puede llegar con la dirección escrita a mano: la isla existe,
    // pero aún no se enseña.
    if(island.underConstruction){

        return (
            <NotFound title={island.name}>
                This island is still under construction. Check back soon.
            </NotFound>
        );

    }


    const blocks = islandBlocks(island);


    return (

        <div>

            <nav className="breadcrumb">
                <Link to="/bethath">{regionName}</Link>
                <span className="breadcrumb__sep">/</span>
                <span className="breadcrumb__current">{island.name}</span>
            </nav>

            <h1 className="page-title">
                {island.name}
            </h1>

            <ContentToc sections={blocks} />

            {
                blocks.length > 0
                    ? blocks.map(block => (

                          <ContentBlock key={block.id} block={block} />

                      ))
                    : <p className="page-intro">This island's story hasn't been written yet.</p>
            }

        </div>

    );

}
