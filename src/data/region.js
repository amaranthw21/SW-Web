// La cabecera de la página de la región (Bethath) es un solo archivo, como la
// portada: src/content/region.json (editable desde el panel, en "Region page").
import region from "../content/region.json";


// El nombre de la región da título a la página, a la entrada de la barra lateral
// y a la miga de pan de las islas.
export const regionName = region.region?.trim() || "Bethath";


export default region;
