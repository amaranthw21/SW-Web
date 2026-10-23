import home from "../data/home";
import Card from "../components/Card";
import Paragraphs from "../components/Paragraphs";
import useDocumentTitle from "../lib/useDocumentTitle";
import asset from "../lib/asset";


// Un enlace: su logo y su nombre debajo, como la fila de logos que ponen las
// webs para enlazar a otras. Sin logo se pinta la inicial, así que un enlace
// recién añadido no se ve roto mientras no le suban la imagen.
//
// La descripción no se pinta —no cabe en una pieza de este tamaño— pero se
// queda como título del enlace, así que sale al posar el ratón y la leen los
// lectores de pantalla.
function HomeLink({ link }){

    const external = !link.url.startsWith("/");


    return (

        <a
            className="home-link"
            href={link.url}
            title={link.description?.trim() || undefined}
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        >

            <span className="home-link__badge">

                {
                    link.icon?.trim()
                        ? <img
                              src={asset(link.icon)}
                              alt=""
                              loading="lazy"
                              onError={e => { e.currentTarget.style.display = "none"; }}
                          />
                        : <span className="home-link__initial">
                              {link.label.charAt(0)}
                          </span>
                }

            </span>

            <span className="home-link__label">

                {link.label}

                {external && <span className="home-link__out" aria-hidden="true">↗</span>}

            </span>

        </a>

    );

}


export default function Home(){

    // Sin texto: la pestaña se queda con el nombre del sitio, que en la
    // portada es lo correcto.
    useDocumentTitle();

    // Los enlaces útiles son los que tienen nombre y dirección; el resto son
    // filas a medio rellenar en el panel.
    const links = (home.links ?? []).filter(
        link => link.label?.trim() && link.url?.trim()
    );


    return (

        <div>

            {/*
              La cabecera: qué es esto, para quien entra por primera vez. El
              arte va de fondo con la misma idea que las tarjetas de Lore —el
              degradado por encima—, así que el texto se lee siempre.
            */}
            <section
                className={home.image?.trim() ? "home-hero home-hero--art" : "home-hero"}
                style={
                    home.image?.trim()
                        ? { "--home-art": `url(${asset(home.image)})` }
                        : undefined
                }
            >

                <h1 className="home-hero__title">
                    {home.greeting}
                </h1>

                {
                    home.intro?.trim() && (

                        <div className="home-hero__text">
                            <Paragraphs text={home.intro} />
                        </div>

                    )
                }

                {
                    home.discordUrl?.trim() && (

                        <a
                            className="home-hero__cta"
                            href={home.discordUrl}
                            target="_blank"
                            rel="noreferrer"
                        >
                            {home.discordLabel?.trim() || "Join the Discord"}
                        </a>

                    )
                }

            </section>


            {
                home.startHere?.length > 0 && (

                    <section className="home-section">

                        <h2 className="worlds-heading">
                            Start here
                        </h2>

                        <div className="grid card-grid--lore">

                            {
                                home.startHere.map(item => (

                                    <Card

                                        key={item.route ?? item.title}

                                        title={item.title}

                                        description={item.description}

                                        image={item.image}

                                        imagePosition={item.imagePosition}

                                        link={item.route}

                                    />

                                ))
                            }

                        </div>

                    </section>

                )
            }


            {
                links.length > 0 && (

                    <section className="home-section">

                        <h2 className="worlds-heading">
                            {home.linksTitle?.trim() || "Links"}
                        </h2>

                        {/*
                          Todos en una sola fila centrada. Estuvieron agrupados
                          por tipo, con su rótulo, y era peor: los rótulos parten
                          la fila y con pocos enlaces por grupo quedaba una
                          columna de piezas sueltas con medio ancho vacío al
                          lado.
                        */}
                        <div className="home-links__grid">

                            {
                                links.map(link => (

                                    <HomeLink key={link.url} link={link} />

                                ))
                            }

                        </div>

                    </section>

                )
            }

        </div>

    );

}
