import asset from "../lib/asset";


// La cita de cabecera se pinta como una conversación de chat. Cada personaje
// se queda siempre en el mismo lado: el orden en que aparecen por primera vez
// decide si van a la izquierda o a la derecha, así el intercambio se lee como
// un chat de verdad y no salta de lado en cada mensaje.
function sidesBySpeaker(messages){

    const speakers = [];

    messages.forEach(message => {
        const speaker = message.speaker ?? "";
        if(!speakers.includes(speaker)){
            speakers.push(speaker);
        }
    });

    return speaker => speakers.indexOf(speaker ?? "") % 2 === 0
        ? "left"
        : "right";

}


export default function CountryQuote({ messages }){

    // Solo mensajes con texto: una fila a medio rellenar en el CMS no debe
    // dejar una burbuja vacía.
    const chat = (messages ?? []).filter(
        message => message?.text?.trim()
    );

    if(chat.length === 0){

        return null;

    }

    const sideOf = sidesBySpeaker(chat);


    return (

        <div className="quote-chat">

            {
                chat.map((message, i) => (

                    <div
                        key={i}
                        className={`quote-chat__msg quote-chat__msg--${sideOf(message.speaker)}`}
                    >

                        {
                            message.avatar
                                ? <img
                                      className="quote-chat__avatar"
                                      src={asset(message.avatar)}
                                      alt={message.speaker ?? ""}
                                      onError={e => { e.currentTarget.style.visibility = "hidden"; }}
                                  />
                                : <span className="quote-chat__avatar quote-chat__avatar--empty">
                                      {(message.speaker ?? "?").charAt(0)}
                                  </span>
                        }

                        <div className="quote-chat__bubble">

                            {
                                message.speaker && (
                                    <span className="quote-chat__speaker">
                                        {message.speaker}
                                    </span>
                                )
                            }

                            <p className="quote-chat__text">
                                {message.text}
                            </p>

                        </div>

                    </div>

                ))
            }

        </div>

    );

}
