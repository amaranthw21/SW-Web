import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";

import Home from "./pages/Home";
import ItemsHub from "./pages/ItemsHub";
import Region from "./pages/Region";
import Credits from "./pages/Credits";
import NotFound from "./pages/NotFound";


// Las tablas traen todos sus datos (más de mil JSON): se cargan aparte, al
// entrar en ellas, para que la portada no se los descargue.
const Pokemon = lazy(() => import("./pages/Pokemon"));
const Items = lazy(() => import("./pages/Items"));
const Belongings = lazy(() => import("./pages/Belongings"));
const Blessings = lazy(() => import("./pages/Blessings"));
// La ficha de una isla trae la lista de Pokémon (para sus legendarios).
const Island = lazy(() => import("./pages/Island"));
// El panel de edición sin GitHub. Trae todo el contenido y el lector de YAML,
// así que solo se descarga quien entra en él.
const Panel = lazy(() => import("./panel/Panel"));


// En GitHub Pages el sitio cuelga de "/SW-Web/"; el router necesita ese
// prefijo como basename (en dev, BASE_URL es "/").
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";


function App() {

    return (

        <BrowserRouter basename={basename}>
            <Routes>

                {/* Fuera del Layout: el panel lleva su propia barra y no el
                    marco ni la barra lateral de la web. */}
                <Route
                    path="/panel"
                    element={
                        <Suspense fallback={<p style={{ padding: 24 }}>Loading the panel…</p>}>
                            <Panel />
                        </Suspense>
                    }
                />

                <Route element={<Layout />}>

                    {/* Main Pages */}

                    <Route
                        path="/"
                        element={<Home />}
                    />

                    <Route
                        path="/pokemon"
                        element={<Suspense><Pokemon /></Suspense>}
                    />

                    <Route
                        path="/bethath"
                        element={<Region />}
                    />

                    <Route
                        path="/bethath/:islandId"
                        element={<Suspense><Island /></Suspense>}
                    />

                    <Route
                        path="/items"
                        element={<ItemsHub />}
                    />

                    <Route
                        path="/items/list"
                        element={<Suspense><Items /></Suspense>}
                    />

                    <Route
                        path="/items/belongings"
                        element={<Suspense><Belongings /></Suspense>}
                    />

                    <Route
                        path="/items/blessings"
                        element={<Suspense><Blessings /></Suspense>}
                    />

                    <Route
                        path="/credits"
                        element={<Credits />}
                    />


                    {/* Cualquier otra dirección. Va la última: solo entra si no
                        ha coincidido ninguna de arriba. Dentro del Layout, para
                        que conserve la barra y el marco. */}
                    <Route
                        path="*"
                        element={<NotFound />}
                    />

                </Route>

            </Routes>

        </BrowserRouter>

    );

}


export default App;
