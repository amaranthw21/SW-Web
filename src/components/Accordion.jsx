import { useState } from "react";
import { Link } from "react-router-dom";
import asset from "../lib/asset";
import Paragraphs from "./Paragraphs";


export default function Accordion({ title, summary, link, custom, icon, background, backgroundPosition, backgroundZoom }) {

    const [open, setOpen] = useState(false);


    return (

        <div className={custom ? "accordion accordion--custom" : "accordion"}>

            <button
                className="accordion__header"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
            >
                <span className="accordion__left">

                    {
                        icon && (
                            <img
                                className="accordion__thumb"
                                src={asset(icon)}
                                alt=""
                                onError={e => { e.currentTarget.style.display = "none"; }}
                            />
                        )
                    }

                    <span className="accordion__title">
                        {title}
                    </span>

                </span>

                <span className="accordion__icon">
                    {open ? "−" : "+"}
                </span>
            </button>


            <div className={open ? "accordion__body is-open" : "accordion__body"}>

                <div className="accordion__wrap">

                    <div className="accordion__inner">

                        {
                            background && (
                                <div
                                    className="accordion__bg"
                                    style={{
                                        backgroundImage: `linear-gradient(rgba(17, 17, 24, 0.6), rgba(17, 17, 24, 0.6)), url(${asset(background)})`,
                                        backgroundPosition: backgroundPosition || "center",
                                        transform: backgroundZoom ? `scale(${backgroundZoom})` : undefined,
                                        transformOrigin: backgroundPosition || "center"
                                    }}
                                />
                            )
                        }

                        <div className="accordion__content">

                            {/* El summary del CMS se parte en párrafos por línea en blanco. */}
                            <Paragraphs text={summary} />

                            {
                                link && (
                                    <Link to={link} className="accordion__more">
                                        Read more →
                                    </Link>
                                )
                            }

                        </div>

                    </div>

                </div>

            </div>

        </div>

    );

}
