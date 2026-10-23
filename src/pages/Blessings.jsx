import { Link } from "react-router-dom";
import blessings from "../data/blessings";
import { ItemEntry } from "../components/ItemParts";
import useDocumentTitle from "../lib/useDocumentTitle";


// Son pocas (quince), así que sin barra de filtros: se ven todas de un vistazo.
export default function Blessings(){

    useDocumentTitle("Blessings");


    return (

        <div>

            <h1 className="page-title">
                Blessings
            </h1>

            <p className="page-intro">
                The blessings certain legendaries can grant, and what each one is
                called. The rest are on the <Link to="/items/list">item list</Link>.
            </p>


            <div className="data-table-wrap">

                <table className="data-table data-table--blessings">

                    <thead>
                        <tr>
                            <th scope="col">Source</th>
                            <th scope="col">Blessing</th>
                        </tr>
                    </thead>

                    <tbody>

                        {
                            blessings.map(blessing => (

                                <tr key={blessing.id}>

                                    <td className="data-table__main">

                                        <ItemEntry
                                            image={blessing.image}
                                            name={blessing.name}
                                            description={blessing.description}
                                        />

                                    </td>

                                    <td className="data-table__blessing" data-label="Blessing">
                                        {blessing.blessing || "—"}
                                    </td>

                                </tr>

                            ))
                        }

                    </tbody>

                </table>

            </div>

        </div>

    );

}
