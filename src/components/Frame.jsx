import "./Frame.css";


// Marco decorativo. Cada pieza es un div tintado con var(--accent) vía mask.
export default function Frame() {

    return (
        <div className="frame">

            <div className="tl"></div>

            <div className="t"></div>

            <div className="tr"></div>


            <div className="l"></div>

            <div className="r"></div>


            <div className="bl"></div>

            <div className="b"></div>

            <div className="br"></div>

        </div>
    )
}
