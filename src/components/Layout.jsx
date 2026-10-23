import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Frame from "./Frame";
import ScrollToTop from "./ScrollToTop";


export default function Layout() {

    const location = useLocation();

    // El estado del menú vive aquí porque lo comparten dos hermanos: la barra
    // (que tiene el botón) y la barra lateral (que es el panel que se abre).
    //
    // Lo que se guarda no es un booleano sino la ruta en la que se abrió el
    // panel: así "abierto" solo es cierto mientras se siga en esa página y el
    // menú se cierra solo al navegar, sin un efecto que lo vigile (también
    // cuando la navegación viene del botón de atrás del móvil).
    const [openedAt, setOpenedAt] = useState(null);

    const menuOpen = openedAt === location.pathname;

    // El rail de escritorio se ensancha con el ratón por CSS; esto es el
    // anclaje: mantenerlo abierto. Al estar aquí, el contenido puede apartarse
    // para no quedar tapado.
    const [pinned, setPinned] = useState(false);


    // Escape cierra el panel, como cualquier menú.
    useEffect(() => {

        if(!menuOpen){

            return;

        }

        function onKeyDown(event){

            if(event.key === "Escape"){

                // Directamente el setter de useState (estable) en vez de un
                // envoltorio, que se recrearía en cada render y obligaría a
                // resuscribir el listener continuamente.
                setOpenedAt(null);

            }

        }

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);

    }, [menuOpen]);


    return (
        <>
            {/* No pinta nada: reposiciona el scroll al cambiar de página. */}
            <ScrollToTop />

            <Navbar
                menuOpen={menuOpen}
                onToggleMenu={() => setOpenedAt(menuOpen ? null : location.pathname)}
            />

            <Sidebar
                menuOpen={menuOpen}
                onNavigate={() => setOpenedAt(null)}
                pinned={pinned}
                onTogglePin={() => setPinned(open => !open)}
            />

            {/*
              Solo en móvil, y solo con el panel abierto: tocar fuera lo cierra.
              El CSS lo esconde en escritorio, donde el rail no tapa nada.
            */}
            {
                menuOpen && (
                    <div
                        className="rail-backdrop"
                        onClick={() => setOpenedAt(null)}
                    />
                )
            }

            {/* Aparta el contenido para dejarle sitio al rail. */}
            <div className={pinned ? "with-rail with-rail--open" : "with-rail"}>

                <div className="frame-container">

                    <main className="container">

                        <div className="background-overlay">
                            <Outlet />
                        </div>

                    </main>

                    <Frame />

                </div>

            </div>
        </>
    );
}
