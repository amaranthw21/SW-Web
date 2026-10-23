import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";

import Home from "./pages/Home";
import Credits from "./pages/Credits";
import NotFound from "./pages/NotFound";


// En GitHub Pages el sitio cuelga de "/SW-Web/"; el router necesita ese
// prefijo como basename (en dev, BASE_URL es "/").
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";


function App() {

    return (

        <BrowserRouter basename={basename}>
            <Routes>

                <Route element={<Layout />}>

                    {/* Main Pages */}

                    <Route
                        path="/"
                        element={<Home />}
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
