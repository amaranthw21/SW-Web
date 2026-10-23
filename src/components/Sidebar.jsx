import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import asset from "../lib/asset";
import islands from "../data/islands";
import { regionName } from "../data/region";

import {
    HomeIcon,
    LoreIcon,
    PokemonIcon,
    ItemsIcon,
    CreditsIcon,
    AdminIcon,
    ChevronIcon
} from "./NavIcons";


// Las secciones del sitio. Los submenús no se escriben a mano: salen del mismo
// contenido que pintan las páginas, así que al publicar un mundo o un capítulo
// nuevo desde el panel aparece aquí solo.
//
// Una sección con `children` despliega un submenú. Un hijo sin `to` se pinta
// como rótulo de grupo en vez de como enlace, y uno con `disabled` (una isla en
// construcción) como una entrada apagada que no lleva a ninguna parte.
const SECTIONS = [
    {
        to: "/",
        label: "Home",
        icon: <HomeIcon />
    },
    {
        to: "/bethath",
        label: regionName,
        icon: <LoreIcon />,
        children: islands.map(island => ({
            to: `/bethath/${island.id}`,
            label: island.name,
            disabled: island.underConstruction
        }))
    },
    {
        to: "/pokemon",
        label: "Pokémon",
        icon: <PokemonIcon />
    },
    {
        to: "/items",
        label: "Items",
        icon: <ItemsIcon />,
        children: [
            { to: "/items/list", label: "Item list" },
            { to: "/items/belongings", label: "Special belongings" },
            { to: "/items/blessings", label: "Blessings" }
        ]
    },
    {
        to: "/credits",
        label: "Credits",
        icon: <CreditsIcon />
    }
];


// A qué sección pertenece una ruta. "/" solo coincide consigo misma; el resto
// por prefijo, para que /seccion/entrada siga contando como su sección.
function sectionOf(pathname){

    if(pathname === "/"){

        return "/";

    }

    return SECTIONS.find(
        section => section.to !== "/" && pathname.startsWith(section.to)
    )?.to ?? null;

}


// Barra lateral de secciones.
//
// En escritorio es un rail de iconos pegado al borde: se ensancha al pasar el
// ratón (o al tabular dentro, de ahí el :focus-within del CSS) y se queda
// anclado con el botón de abajo. En móvil no hay rail: es el panel que abre la
// hamburguesa de la barra, ya desplegado.
//
// `menuOpen` es ese panel de móvil y `pinned` el anclaje de escritorio; los dos
// viven en Layout, que es quien también tiene que apartar el contenido cuando
// el rail queda anclado.
export default function Sidebar({ menuOpen, onNavigate, pinned, onTogglePin }){

    const location = useLocation();

    // Qué submenú está desplegado. Por defecto, el de la página en la que
    // estás; si lo abres o lo cierras a mano, manda tu decisión mientras sigas
    // en esa misma página. Al navegar, la elección caduca y vuelve a mandar la
    // ruta: así al entrar en un capítulo desde su submenú, el submenú sigue
    // abierto sin tener que sincronizar nada.
    const [choice, setChoice] = useState(null);

    const openTo = choice?.path === location.pathname
        ? choice.to
        : sectionOf(location.pathname);


    function toggle(to){

        setChoice({
            path: location.pathname,
            to: openTo === to ? null : to
        });

    }


    const classes = ["rail"];

    if(menuOpen){
        classes.push("rail--open");
    }

    if(pinned){
        classes.push("rail--pinned");
    }


    return (

        <nav
            id="primary-nav"
            className={classes.join(" ")}
            aria-label="Sections"
        >

            <ul className="rail__list">

                {
                    SECTIONS.map(section => {

                        const isOpen = openTo === section.to;

                        const submenuId = `rail-sub-${section.label.toLowerCase()}`;


                        return (

                            <li key={section.to} className="rail__item">

                                <div className="rail__row">

                                    <NavLink
                                        to={section.to}
                                        end={section.to === "/"}
                                        className="rail__link"
                                        onClick={onNavigate}
                                    >

                                        <span className="rail__icon">
                                            {section.icon}
                                        </span>

                                        <span className="rail__label">
                                            {section.label}
                                        </span>

                                    </NavLink>

                                    {
                                        section.children?.length > 0 && (

                                            <button
                                                type="button"
                                                className={isOpen ? "rail__chevron rail__chevron--open" : "rail__chevron"}
                                                aria-expanded={isOpen}
                                                aria-controls={submenuId}
                                                aria-label={`${isOpen ? "Collapse" : "Expand"} ${section.label}`}
                                                onClick={() => toggle(section.to)}
                                            >

                                                <ChevronIcon />

                                            </button>

                                        )
                                    }

                                </div>

                                {
                                    section.children?.length > 0 && (

                                        <ul
                                            id={submenuId}
                                            className="rail__sub"
                                            hidden={!isOpen}
                                        >

                                            {
                                                section.children.map(child => (

                                                    <li key={child.to ?? `head-${child.label}`}>

                                                        {
                                                            child.disabled
                                                                ? <span
                                                                      className="rail__sublink rail__sublink--disabled"
                                                                      aria-disabled="true"
                                                                      title="Under construction"
                                                                  >
                                                                      {child.label}
                                                                  </span>
                                                                : child.to
                                                                ? <NavLink
                                                                      to={child.to}
                                                                      className="rail__sublink"
                                                                      onClick={onNavigate}
                                                                  >
                                                                      {child.label}
                                                                  </NavLink>
                                                                : <span className="rail__subhead">
                                                                      {child.label}
                                                                  </span>
                                                        }

                                                    </li>

                                                ))
                                            }

                                        </ul>

                                    )
                                }

                            </li>

                        );

                    })
                }

            </ul>


            {/*
              El acceso al panel de edición, solo en el menú de móvil: en
              escritorio vive en la barra de arriba, donde hay sitio y se pulsa
              con precisión de ratón.

              Aquí porque arriba quedaba pegado a la hamburguesa —seis píxeles— y
              la gente que iba a abrir el menú aterrizaba en el CMS.
            */}
            <a
                className="rail__admin"
                href={asset("/admin/index.html")}
                onClick={onNavigate}
            >

                <span className="rail__icon">
                    <AdminIcon />
                </span>

                <span className="rail__label">
                    Admin
                </span>

            </a>


            {/*
              Solo se ve en escritorio: en el panel de móvil no hay nada que
              anclar, ya está desplegado.
            */}
            <button
                type="button"
                className="rail__pin"
                aria-pressed={pinned}
                aria-label={pinned ? "Unpin the sidebar" : "Keep the sidebar open"}
                onClick={onTogglePin}
            >

                <span className="rail__pin-icon">
                    <ChevronIcon />
                </span>

                <span className="rail__label">
                    {pinned ? "Collapse" : "Keep open"}
                </span>

            </button>

        </nav>

    );

}
