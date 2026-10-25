import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import normalize from "../lib/normalize";
import useDocumentTitle from "../lib/useDocumentTitle";

import { API, ApiError, deleteFiles, listFiles, loadSession, login, readJson, saveSession, writeJson } from "./api";
import { Account, AcceptInvite, Admins } from "./Accounts";
import { Fields } from "./Fields";
import { bundledData, emptyObject, entriesOf, entryFiles, loadConfig, missingFields, newEntryPath, summaryOf } from "./schema";

import "./panel.css";


// Panel de edición para los admins sin cuenta de GitHub. Entran con usuario y
// contraseña (cada uno elige la suya con un enlace de invitación); el backend
// (worker/) hace los commits por ellos. Los formularios
// salen de src/panel/config.yml.
//
// Dónde se está va en la dirección (?c=colección&f=archivo), para que el botón
// de atrás del navegador funcione y se pueda pasar un enlace a una entrada.
export default function Panel(){

    useDocumentTitle("Editing panel");

    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(loadSession);
    const [notice, setNotice] = useState("");

    const updateSession = useCallback(next => {
        saveSession(next);
        setSession(next);
    }, []);

    const logout = useCallback(message => {
        saveSession(null);
        setSession(null);
        setNotice(message ?? "");
    }, []);

    if(!API){
        return (
            <Shell>
                <div className="panel-card">
                    <h2>Panel not configured</h2>
                    <p>Set <code>VITE_PANEL_API</code> to the address of the panel Worker (see worker/README.md).</p>
                </div>
            </Shell>
        );
    }

    // Un enlace de invitación manda aunque haya otra sesión abierta en este
    // navegador: quien lo abre es quien va a usar la cuenta.
    if(params.get("invite")){
        return (
            <Shell>
                <AcceptInvite
                    token={params.get("invite")}
                    onSession={next => { updateSession(next); navigate("/panel", { replace: true }); }}
                />
            </Shell>
        );
    }

    if(!session){
        return (
            <Shell>
                <Login notice={notice} onLogin={updateSession} />
            </Shell>
        );
    }

    return <Workspace session={session} logout={logout} onSession={updateSession} />;

}


function Shell({ children, session, onLogout }){

    return (

        <div className="panel">

            <header className="panel-bar">
                <Link to="/panel" className="panel-bar__title">SW-Web · <span>Editing panel</span></Link>
                <div className="panel-bar__side">
                    <Link to="/" className="panel-bar__link panel-bar__site">View site</Link>
                    {session && (
                        <>
                            {session.owner && <Link to="/panel?view=admins" className="panel-bar__link">Admins</Link>}
                            <Link to="/panel?view=account" className="panel-bar__user" title="Account and password">{session.user}</Link>
                            <button type="button" className="panel-btn panel-btn--ghost" onClick={() => onLogout()}>Sign out</button>
                        </>
                    )}
                </div>
            </header>

            <main className="panel-main">{children}</main>

        </div>

    );

}


function Login({ notice, onLogin }){

    const [user, setUser] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(notice);
    const [busy, setBusy] = useState(false);

    async function submit(event){

        event.preventDefault();
        setBusy(true);
        setError("");

        try {
            onLogin(await login(user.trim(), password));
        } catch(err){
            setError(err.message);
            setBusy(false);
        }

    }

    return (

        <form className="panel-card panel-login" onSubmit={submit}>

            <h2>Sign in</h2>
            <p className="panel-muted">For admins. Ask the owner of the site for an account.</p>

            <label className="panel-field__label" htmlFor="panel-user">User</label>
            <input id="panel-user" className="panel-input" autoComplete="username" value={user} onChange={event => setUser(event.target.value)} required />

            <label className="panel-field__label" htmlFor="panel-password">Password</label>
            <input id="panel-password" className="panel-input" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />

            {error && <p className="panel-error">{error}</p>}

            <button type="submit" className="panel-btn panel-btn--primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>

            {API === "/__panel" && <p className="panel-muted">Local mode: any user name, password <code>dev</code> (as an owner). Edits write to the files on this computer.</p>}

        </form>

    );

}


function Workspace({ session, logout, onSession }){

    const [params, setParams] = useSearchParams();
    const [config, setConfig] = useState(null);
    const [paths, setPaths] = useState(null);
    const [error, setError] = useState("");

    // Lo guardado en esta sesión: tapa al contenido del build en los resúmenes,
    // que si no seguirían enseñando el valor viejo hasta el siguiente deploy.
    const [saved, setSaved] = useState({});

    // El aviso que queda en la lista después de borrar una entrada.
    const [notice, setNotice] = useState(null);

    const fail = useCallback(err => {
        if(err instanceof ApiError && err.status === 401){
            logout("Your session expired. Sign in again.");
        } else {
            setError(err.message);
        }
    }, [logout]);

    useEffect(() => {
        Promise.all([loadConfig(), listFiles(session)])
            .then(([nextConfig, nextPaths]) => { setConfig(nextConfig); setPaths(nextPaths); })
            .catch(fail);
    }, [session, fail]);

    const collection = config?.collections.find(item => item.name === params.get("c"));
    const file = params.get("f");
    const creating = params.has("new");
    const view = params.get("view");

    let content;

    if(view === "account"){
        content = <Account session={session} onSession={onSession} />;
    } else if(view === "admins" && session.owner){
        content = <Admins session={session} onError={fail} />;
    } else if(error){
        content = <div className="panel-card"><p className="panel-error">{error}</p></div>;
    } else if(!config || !paths){
        content = <p className="panel-muted">Loading…</p>;
    } else if(collection && (file || creating)){
        content = (
            <Editor
                key={file ?? "new"}
                session={session}
                config={config}
                collection={collection}
                file={file}
                paths={paths}
                addPath={path => setPaths(current => current.includes(path) ? current : [...current, path])}
                onSaved={(path, data) => {
                    setSaved(current => ({ ...current, [path]: data }));
                    if(creating){
                        setParams({ c: collection.name, f: path }, { replace: true });
                    }
                }}
                onDeleted={(removed, title) => {
                    setPaths(current => current.filter(path => !removed.includes(path)));
                    setNotice({ collection: collection.name, text: `“${title}” was deleted.` });
                    setParams({ c: collection.name }, { replace: true });
                    window.scrollTo(0, 0);
                }}
                onError={fail}
            />
        );
    } else if(collection){
        content = (
            <EntryList
                collection={collection}
                paths={paths}
                saved={saved}
                notice={notice?.collection === collection.name ? notice.text : ""}
            />
        );
    } else {
        content = <Collections config={config} paths={paths} saved={saved} session={session} />;
    }

    return <Shell session={session} onLogout={logout}>{content}</Shell>;

}


function Collections({ config, paths, saved, session }){

    return (

        <>

            <div className="panel-note">
                {session.review
                    ? "Your changes are collected in a pull request. They go live once someone with GitHub access merges it."
                    : "Saved changes go live on the site in about two minutes."}
            </div>

            <GlobalSearch config={config} paths={paths} saved={saved} />

            <div className="panel-grid">
                {config.collections.map(collection => (
                    <Link key={collection.name} to={`?c=${collection.name}`} className="panel-tile">
                        <strong>{collection.label}</strong>
                        <span className="panel-muted">{entriesOf(collection, paths).length} {collection.files ? "pages" : "entries"}</span>
                    </Link>
                ))}
            </div>

        </>

    );

}


const RESULTS = 30;


// Lo que se mira de cada entrada, aparte de su resumen: los textos cortos de
// primer nivel (forma, dueño, tipo, nota…). Las descripciones largas y las
// rutas de imagen se dejan fuera, o casi cualquier palabra encontraría medio
// archivo.
function searchText(data){

    return Object.values(data ?? {})
        .filter(value => (typeof value === "string" && value.length <= 60 && !/\.(png|jpe?g|webp|avif|gif|svg)$/i.test(value))
            || typeof value === "number")
        .join(" ");

}


// Busca en todas las colecciones a la vez, para llegar a un Pokémon o a un
// objeto sin abrir antes su lista. Primero lo que empieza por lo escrito (por
// nombre), luego lo que lo contiene en el resumen y al final en otro campo.
function GlobalSearch({ config, paths, saved }){

    const navigate = useNavigate();
    const [query, setQuery] = useState("");

    const index = useMemo(() => config.collections.flatMap(collection =>
        entriesOf(collection, paths).map(entry => {
            const data = saved[entry.path] ?? bundledData(entry.path);
            const summary = summaryOf(collection, entry, data);
            return {
                collection,
                entry,
                summary,
                name: normalize(String(data?.[collection.identifier_field ?? "title"] ?? entry.label ?? summary)),
                summaryText: normalize(summary),
                extraText: normalize(searchText(data))
            };
        })
    ), [config, paths, saved]);

    const needle = normalize(query.trim());

    const results = needle
        ? index
            .map(item => ({
                ...item,
                rank: item.name.startsWith(needle) ? 0
                    : item.summaryText.includes(needle) ? 1
                    : item.extraText.includes(needle) ? 2
                    : -1
            }))
            .filter(item => item.rank >= 0)
            .sort((a, b) => a.rank - b.rank || a.summary.localeCompare(b.summary))
        : [];

    const linkOf = item => `?c=${item.collection.name}&f=${encodeURIComponent(item.entry.path)}`;

    return (

        <div className="panel-search">

            <input
                className="panel-input panel-search__input"
                type="search"
                placeholder="Search everything: a Pokémon, an item, an owner…"
                aria-label="Search all collections"
                value={query}
                onChange={event => setQuery(event.target.value)}
                onKeyDown={event => {
                    // Enter abre el primer resultado: lo normal es buscar uno concreto.
                    if(event.key === "Enter" && results.length){
                        navigate(linkOf(results[0]));
                    }
                }}
            />

            {needle && (
                results.length === 0
                    ? <p className="panel-muted">Nothing matches “{query.trim()}”.</p>
                    : (
                        <>
                            <ul className="panel-entries panel-search__results">
                                {results.slice(0, RESULTS).map(item => (
                                    <li key={item.entry.path}>
                                        <Link to={linkOf(item)}>
                                            <span className="panel-search__kind">{item.collection.label_singular ?? item.collection.label}</span>
                                            {item.summary}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            {results.length > RESULTS && (
                                <p className="panel-muted">Showing {RESULTS} of {results.length}. Type a bit more to narrow it down.</p>
                            )}
                        </>
                    )
            )}

        </div>

    );

}


const PAGE = 100;


function EntryList({ collection, paths, saved, notice }){

    const [query, setQuery] = useState("");
    const [limit, setLimit] = useState(PAGE);

    const entries = useMemo(() => {

        const sortField = collection.sortable_fields?.[0];

        return entriesOf(collection, paths)
            .map(entry => {
                const data = saved[entry.path] ?? bundledData(entry.path);
                const summary = summaryOf(collection, entry, data);
                return { ...entry, data, summary, text: normalize(`${summary} ${searchText(data)}`) };
            })
            .sort((a, b) => {
                const x = a.data?.[sortField];
                const y = b.data?.[sortField];
                if(typeof x === "number" && typeof y === "number"){
                    return x - y;
                }
                return String(x ?? a.summary).localeCompare(String(y ?? b.summary));
            });

    }, [collection, paths, saved]);

    const needle = normalize(query.trim());
    const shown = needle ? entries.filter(entry => entry.text.includes(needle)) : entries;

    return (

        <>

            <nav className="panel-crumbs"><Link to="/panel">Collections</Link> › {collection.label}</nav>

            {notice && <div className="panel-note">{notice}</div>}

            <div className="panel-toolbar">
                <input
                    className="panel-input"
                    type="search"
                    placeholder={`Search ${collection.label.toLowerCase()}…`}
                    value={query}
                    onChange={event => { setQuery(event.target.value); setLimit(PAGE); }}
                />
                {collection.create && (
                    <Link to={`?c=${collection.name}&new`} className="panel-btn panel-btn--primary">
                        + New {(collection.label_singular ?? "entry").toLowerCase()}
                    </Link>
                )}
            </div>

            <ul className="panel-entries">
                {shown.slice(0, limit).map(entry => (
                    <li key={entry.path}>
                        <Link to={`?c=${collection.name}&f=${encodeURIComponent(entry.path)}`}>{entry.summary}</Link>
                    </li>
                ))}
            </ul>

            {shown.length === 0 && <p className="panel-muted">Nothing matches.</p>}

            {shown.length > limit && (
                <button type="button" className="panel-btn panel-btn--ghost" onClick={() => setLimit(limit + PAGE)}>
                    Show more ({shown.length - limit} left)
                </button>
            )}

        </>

    );

}


function Editor({ session, config, collection, file, paths, addPath, onSaved, onDeleted, onError }){

    const fileEntry = collection.files?.find(item => item.file === file);
    const fields = fileEntry?.fields ?? collection.fields;

    const [data, setData] = useState(file ? null : emptyObject(fields));
    const [original, setOriginal] = useState(file ? null : JSON.stringify(data));
    const [sha, setSha] = useState(null);
    const [status, setStatus] = useState("");
    const [problems, setProblems] = useState([]);
    const [problemsTitle, setProblemsTitle] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {

        if(!file){
            return;
        }

        readJson(session, file)
            .then(result => {
                setData(result.data);
                setOriginal(JSON.stringify(result.data));
                setSha(result.sha);
            })
            .catch(onError);

    }, [session, file, onError]);

    const dirty = data && JSON.stringify(data) !== original;

    // Avisa antes de cerrar la pestaña con cambios sin guardar.
    useEffect(() => {

        if(!dirty){
            return;
        }

        const warn = event => event.preventDefault();
        window.addEventListener("beforeunload", warn);

        return () => window.removeEventListener("beforeunload", warn);

    }, [dirty]);

    if(!data){
        return <p className="panel-muted">Loading…</p>;
    }

    const path = file ?? newEntryPath(collection, data);
    const title = fileEntry?.label ?? (file ? summaryOf(collection, { slug: file }, data) : `New ${(collection.label_singular ?? "entry").toLowerCase()}`);

    async function save(){

        const missing = missingFields(fields, data);
        setProblems(missing);
        setProblemsTitle("Can't save yet:");

        if(missing.length){
            return;
        }

        if(!path){
            setProblems([`${collection.identifier_field ?? "title"} (needed for the file name)`]);
            return;
        }

        if(!file && paths.includes(path)){
            setProblems([`An entry called "${path.split("/").pop()}" already exists`]);
            return;
        }

        setBusy(true);
        setStatus("Saving…");

        try {

            const verb = file ? "Update" : "Create";
            const name = data[collection.identifier_field ?? "title"] ?? fileEntry?.label ?? path;
            const result = await writeJson(session, path, data, sha, `${verb} ${collection.label_singular ?? collection.label} “${name}”`);

            setSha(result.sha);
            setOriginal(JSON.stringify(data));
            setStatus(session.review ? "Saved to the pull request." : "Saved. It'll be live in a couple of minutes.");
            addPath(path);
            onSaved(path, data);

        } catch(err){

            setStatus("");

            if(err instanceof ApiError && err.status !== 401){
                setProblems([err.message]);
            } else {
                onError(err);
            }

        } finally {

            setBusy(false);

        }

    }

    // Las páginas sueltas (portada, región) no se borran, y una colección puede
    // pedir lo mismo con `delete: false` en config.yml.
    const canDelete = file && !fileEntry && collection.delete !== false;

    async function remove(){

        const files = entryFiles(collection, file, paths);
        const name = data[collection.identifier_field ?? "title"] || title;
        const extra = files.length > 1 ? `\n\nIts ${files.length - 1} other file(s) in the same folder (pictures) go too.` : "";
        const when = session.review
            ? "It disappears from the site when the pull request is merged."
            : "It disappears from the site in a couple of minutes.";

        if(!window.confirm(`Delete “${name}”?${extra}\n\n${when}`)){
            return;
        }

        setBusy(true);
        setStatus("Deleting…");

        try {

            await deleteFiles(session, files, sha, `Delete ${collection.label_singular ?? collection.label} “${name}”`);
            onDeleted(files, name);

        } catch(err){

            setStatus("");
            setBusy(false);

            if(err instanceof ApiError && err.status !== 401){
                setProblems([err.message]);
                setProblemsTitle("Couldn't delete it:");
            } else {
                onError(err);
            }

        }

    }

    const ctx = { session, config, collection, entryPath: path, saved: !!file, paths, addPath };

    return (

        <>

            <nav className="panel-crumbs">
                <Link to="/panel">Collections</Link> › <Link to={`?c=${collection.name}`}>{collection.label}</Link> › {title}
            </nav>

            <div className="panel-card panel-editor">

                <Fields fields={fields} value={data} onChange={setData} ctx={ctx} />

            </div>

            <div className="panel-savebar">

                {problems.length > 0 && (
                    <div className="panel-error">
                        {problemsTitle}
                        <ul>{problems.map(problem => <li key={problem}>{problem}</li>)}</ul>
                    </div>
                )}

                <div className="panel-row">
                    {canDelete && (
                        <button type="button" className="panel-btn panel-btn--danger panel-savebar__delete" disabled={busy} onClick={remove}>
                            Delete
                        </button>
                    )}
                    <span className="panel-muted">{dirty ? "Unsaved changes" : status}</span>
                    <button type="button" className="panel-btn panel-btn--primary" disabled={busy || !dirty} onClick={save}>
                        {busy ? "Saving…" : "Save"}
                    </button>
                </div>

            </div>

        </>

    );

}
