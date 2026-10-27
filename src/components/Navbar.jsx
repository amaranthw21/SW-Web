import { Link } from "react-router-dom";
// El original mide 866px y pesa 1MB; en el menú se ve a 55px.
import serverIcon from "../assets/IconServer-128.png?thumb=128";


// La barra superior. Las secciones del sitio viven en la barra lateral
// (Sidebar); aquí solo quedan el logo y el acceso al panel de edición.
//
// El estado del menú de móvil lo lleva Layout, porque el panel que abre este
// botón es la propia barra lateral.
export default function Navbar({ menuOpen, onToggleMenu }){

    return (

        <nav className={menuOpen ? "navbar navbar--open" : "navbar"}>


            <Link to="/" className="logo">

                <img
                    src={serverIcon}
                    alt="Server Icon"
                />

                <span>
                    SW-Web
                </span>

            </Link>


            <div className="navbar__actions">

                {/*
                  El panel de edición (/panel), donde entran todos los admins
                  con su usuario y contraseña.
                */}
                <Link to="/panel" className="admin-link">
                    Admin
                </Link>

                {/*
                  Abre la barra lateral en móvil. En escritorio el rail está
                  siempre a la vista, así que el CSS lo esconde. Es un <button>
                  de verdad para que funcione con teclado y lo anuncien los
                  lectores de pantalla.
                */}
                <button
                    type="button"
                    className="nav-toggle"
                    aria-expanded={menuOpen}
                    aria-controls="primary-nav"
                    aria-label={menuOpen ? "Close menu" : "Open menu"}
                    onClick={onToggleMenu}
                >

                    <span className="nav-toggle__bars" aria-hidden="true" />

                </button>

            </div>


        </nav>

    );

}
