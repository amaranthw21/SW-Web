import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
    acceptInvite, cancelInvite, changePassword, createInvite, getInvite, inviteLink,
    listAdmins, removeAdmin
} from "./api";


const MIN_PASSWORD = 10;


// Contraseña nueva con su repetición. Lo usan la invitación y el cambio de
// contraseña, así que las dos piden lo mismo.
function NewPassword({ password, setPassword, repeat, setRepeat }){

    return (
        <>
            <label className="panel-field__label" htmlFor="panel-new">New password</label>
            <input id="panel-new" className="panel-input" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} required />
            <p className="panel-field__hint">At least {MIN_PASSWORD} characters. A short sentence is easier to remember than a jumble of symbols.</p>

            <label className="panel-field__label" htmlFor="panel-repeat">Repeat it</label>
            <input id="panel-repeat" className="panel-input" type="password" autoComplete="new-password" value={repeat} onChange={event => setRepeat(event.target.value)} required />
        </>
    );

}


function passwordProblem(password, repeat){

    if(password.length < MIN_PASSWORD){
        return `The password needs at least ${MIN_PASSWORD} characters.`;
    }

    if(password !== repeat){
        return "The two passwords don't match.";
    }

    return "";

}


// Lo que ve quien abre un enlace de invitación: elige su contraseña y entra.
export function AcceptInvite({ token, onSession }){

    const [invite, setInvite] = useState(null);
    const [error, setError] = useState("");
    const [password, setPassword] = useState("");
    const [repeat, setRepeat] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        getInvite(token).then(setInvite).catch(err => setError(err.message));
    }, [token]);

    async function submit(event){

        event.preventDefault();

        const problem = passwordProblem(password, repeat);

        if(problem){
            setError(problem);
            return;
        }

        setBusy(true);
        setError("");

        try {
            onSession(await acceptInvite(token, password));
        } catch(err){
            setError(err.message);
            setBusy(false);
        }

    }

    if(!invite){
        return (
            <div className="panel-card panel-login">
                <h2>Invitation</h2>
                {error ? <p className="panel-error">{error}</p> : <p className="panel-muted">Checking the invitation…</p>}
                <Link to="/panel" className="panel-btn">Go to sign in</Link>
            </div>
        );
    }

    return (

        <form className="panel-card panel-login" onSubmit={submit}>

            <h2>{invite.reset ? "Choose a new password" : "Welcome!"}</h2>

            <p className="panel-muted">
                {invite.reset
                    ? <>Set a new password for <strong>{invite.user}</strong>. The old one stops working.</>
                    : <><strong>{invite.by}</strong> invited you to edit the archive. Your user name is <strong>{invite.user}</strong>; choose a password to finish.</>}
            </p>

            <NewPassword password={password} setPassword={setPassword} repeat={repeat} setRepeat={setRepeat} />

            {error && <p className="panel-error">{error}</p>}

            <button type="submit" className="panel-btn panel-btn--primary" disabled={busy}>
                {busy ? "Saving…" : "Save and sign in"}
            </button>

            <p className="panel-muted">This link works once. Keep your password somewhere safe: nobody else can see it, not even the owners.</p>

        </form>

    );

}


export function Account({ session, onSession }){

    const [current, setCurrent] = useState("");
    const [password, setPassword] = useState("");
    const [repeat, setRepeat] = useState("");
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const [busy, setBusy] = useState(false);

    async function submit(event){

        event.preventDefault();

        const problem = passwordProblem(password, repeat);

        if(problem){
            setError(problem);
            return;
        }

        setBusy(true);
        setError("");

        try {
            onSession(await changePassword(session, current, password));
            setDone(true);
            setCurrent("");
            setPassword("");
            setRepeat("");
        } catch(err){
            setError(err.message);
        } finally {
            setBusy(false);
        }

    }

    return (

        <>

            <nav className="panel-crumbs"><Link to="/panel">Collections</Link> › Account</nav>

            <form className="panel-card panel-form" onSubmit={submit}>

                <h2>Change your password</h2>
                <p className="panel-muted">Signed in as <strong>{session.user}</strong>{session.owner ? " (owner)" : ""}. Changing it signs you out everywhere else.</p>

                <label className="panel-field__label" htmlFor="panel-current">Current password</label>
                <input id="panel-current" className="panel-input" type="password" autoComplete="current-password" value={current} onChange={event => setCurrent(event.target.value)} required />

                <NewPassword password={password} setPassword={setPassword} repeat={repeat} setRepeat={setRepeat} />

                {error && <p className="panel-error">{error}</p>}
                {done && !error && <p className="panel-ok">Password changed.</p>}

                <button type="submit" className="panel-btn panel-btn--primary" disabled={busy}>{busy ? "Saving…" : "Change password"}</button>

            </form>

        </>

    );

}


function formatDate(time){

    return time ? new Date(time).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";

}


// Solo para las dueñas: invitar, ver quién tiene cuenta y quitarla.
export function Admins({ session, onError }){

    const [data, setData] = useState(null);
    const [name, setName] = useState("");
    const [created, setCreated] = useState(null);
    const [copied, setCopied] = useState("");
    const [error, setError] = useState("");

    const load = useCallback(() => {
        listAdmins(session).then(setData).catch(onError);
    }, [session, onError]);

    useEffect(load, [load]);

    async function invite(user){

        setError("");
        setCopied("");

        try {
            const result = await createInvite(session, user);
            setCreated(result);
            setName("");
            load();
        } catch(err){
            setError(err.message);
        }

    }

    async function copy(token){

        try {
            await navigator.clipboard.writeText(inviteLink(token));
            setCopied(token);
        } catch {
            // Sin permiso para el portapapeles: el enlace sigue a la vista para copiarlo a mano.
        }

    }

    async function remove(user){

        if(!window.confirm(`Remove ${user}? They're signed out at once and can't come back without a new invitation.`)){
            return;
        }

        await removeAdmin(session, user).catch(onError);
        load();

    }

    async function cancel(token){

        await cancelInvite(session, token).catch(onError);

        if(created?.token === token){
            setCreated(null);
        }

        load();

    }

    return (

        <>

            <nav className="panel-crumbs"><Link to="/panel">Collections</Link> › Admins</nav>

            <form className="panel-card panel-form" onSubmit={event => { event.preventDefault(); invite(name); }}>

                <h2>Invite an admin</h2>
                <p className="panel-muted">You get a link to send them (by Discord, for example). They open it and choose their own password. It works once and expires in 7 days.</p>

                <label className="panel-field__label" htmlFor="panel-invite-name">User name</label>
                <div className="panel-row">
                    <input id="panel-invite-name" className="panel-input panel-input--grow" placeholder="e.g. ana" value={name} onChange={event => setName(event.target.value)} required />
                    <button type="submit" className="panel-btn panel-btn--primary">Create link</button>
                </div>
                <p className="panel-field__hint">What they'll type to sign in. Lowercase letters, numbers, dots, dashes or underscores.</p>

                {error && <p className="panel-error">{error}</p>}

                {created && (
                    <div className="panel-invite">
                        <p>Link for <strong>{created.user}</strong>:</p>
                        <div className="panel-row">
                            <input className="panel-input panel-input--grow" readOnly value={inviteLink(created.token)} onFocus={event => event.target.select()} />
                            <button type="button" className="panel-btn" onClick={() => copy(created.token)}>{copied === created.token ? "Copied!" : "Copy"}</button>
                        </div>
                        <p className="panel-field__hint">Send it privately: whoever opens it first gets the account.</p>
                    </div>
                )}

            </form>

            {data && (
                <div className="panel-card panel-form">

                    <h2>Admins</h2>

                    <ul className="panel-people">
                        {data.admins.map(admin => (
                            <li key={admin.user}>
                                <span>
                                    <strong>{admin.user}</strong>
                                    <span className="panel-muted">
                                        {admin.owner ? " · owner" : ` · invited by ${admin.by ?? "?"}${admin.created ? `, ${formatDate(admin.created)}` : ""}`}
                                    </span>
                                </span>
                                {!admin.owner && (
                                    <span className="panel-row">
                                        <button type="button" className="panel-btn panel-btn--ghost" title="Make a link to set a new password" onClick={() => invite(admin.user)}>New password link</button>
                                        <button type="button" className="panel-btn panel-btn--danger" onClick={() => remove(admin.user)}>Remove</button>
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>

                    {data.invites.length > 0 && (
                        <>
                            <h3 className="panel-subtitle">Pending invitations</h3>
                            <ul className="panel-people">
                                {data.invites.map(item => (
                                    <li key={item.token}>
                                        <span>
                                            <strong>{item.user}</strong>
                                            <span className="panel-muted"> · expires {formatDate(item.expires)}</span>
                                        </span>
                                        <span className="panel-row">
                                            <button type="button" className="panel-btn panel-btn--ghost" onClick={() => copy(item.token)}>{copied === item.token ? "Copied!" : "Copy link"}</button>
                                            <button type="button" className="panel-btn panel-btn--danger" onClick={() => cancel(item.token)}>Cancel</button>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                </div>
            )}

        </>

    );

}
