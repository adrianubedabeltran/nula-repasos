import { useState, useRef, useEffect } from "react";

const HABITACIONES = [
  "Salón", "Cocina", "Dormitorio principal", "Dormitorio 2", "Dormitorio 3",
  "Baño principal", "Baño auxiliar", "Pasillo", "Terraza", "Garaje",
  "Zona común", "Fachada", "Cubierta", "Instalaciones", "Otro"
];

const RESPONSABLES = [
  "Electricista", "Fontanero", "Alicatador", "Pintor", "Carpintero",
  "Yesero", "Solador", "Instalador HVAC", "Empresa general", "Otro"
];

const ESTADOS = {
  pendiente:  { label: "Pendiente",  dot: "#000" },
  en_proceso: { label: "En proceso", dot: "#888" },
  resuelto:   { label: "Resuelto",   dot: "#ccc" },
};

const initialNotes = [
  {
    id: 1,
    habitacion: "Baño principal",
    responsable: "Alicatador",
    comentario: "Junta del alicatado mal sellada en esquina inferior izquierda de la ducha. Revisar impermeabilización.",
    estado: "pendiente",
    fecha: "2026-04-06",
    fotos: [],
    prioridad: "alta",
  },
  {
    id: 2,
    habitacion: "Salón",
    responsable: "Pintor",
    comentario: "Fisura en encuentro techo-pared lateral ventana. Necesita masilla y repintado.",
    estado: "en_proceso",
    fecha: "2026-04-07",
    fotos: [],
    prioridad: "media",
  },
];

// ── typography & color tokens (NULA.STUDIO identity) ──
const T = {
  sans: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono: "'Courier New', Courier, monospace",
  black: "#0A0A0A",
  mid:   "#555",
  light: "#AAA",
  line:  "#E0E0E0",
  bg:    "#F8F8F6",
  white: "#FFFFFF",
};

function PhotoGrid({ fotos, onRemove }) {
  if (!fotos.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, marginTop: 10 }}>
      {fotos.map((f, i) => (
        <div key={i} style={{ position: "relative", aspectRatio: "1", overflow: "hidden", background: T.line }}>
          <img src={f.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          {onRemove && (
            <button onClick={() => onRemove(i)} style={{
              position: "absolute", top: 4, right: 4,
              background: T.white, border: `1px solid ${T.line}`, borderRadius: 0,
              width: 20, height: 20, color: T.black, fontSize: 10, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1, fontFamily: T.mono
            }}>×</button>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusDot({ estado }) {
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: ESTADOS[estado]?.dot || T.black, marginRight: 6, flexShrink: 0
    }} />
  );
}

function NoteCard({ note, onEdit, filtro }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={() => onEdit(note)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "#F2F2F0" : T.white,
        borderBottom: `1px solid ${T.line}`,
        padding: "12px 16px",
        cursor: "pointer",
        transition: "background 0.12s",
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      {/* Fila 1: habitación + responsable */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 10, fontFamily: T.mono, color: T.black, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {note.habitacion}
        </span>
        <span style={{ fontSize: 10, fontFamily: T.mono, color: T.light, letterSpacing: "0.04em" }}>
          {note.responsable}
        </span>
      </div>
      {/* Fila 2: descripción */}
      <div style={{ fontSize: 13, fontFamily: T.sans, color: T.black, lineHeight: 1.55 }}>
        {note.comentario}
      </div>
      {/* Fila 3: fotos */}
      {note.fotos.length > 0 && (
        <div style={{ fontSize: 10, fontFamily: T.mono, color: T.light, letterSpacing: "0.04em" }}>
          {note.fotos.length} foto{note.fotos.length > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

function Modal({ note, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(note || {
    habitacion: HABITACIONES[0], responsable: RESPONSABLES[0],
    comentario: "", estado: "pendiente", fecha: new Date().toISOString().slice(0, 10),
    fotos: [], prioridad: "media"
  });
  const fileRef = useRef();

  const handleFoto = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm(f => ({ ...f, fotos: [...f.fotos, { url: ev.target.result, name: file.name }] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFoto = (i) => setForm(f => ({ ...f, fotos: f.fotos.filter((_, idx) => idx !== i) }));

  const lbl = {
    display: "block", fontSize: 10, fontFamily: T.mono, color: T.mid,
    letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, marginTop: 18
  };
  const inp = {
    width: "100%", padding: "10px 12px", border: `1px solid ${T.line}`,
    background: T.white, color: T.black, fontSize: 13, outline: "none",
    fontFamily: T.sans, boxSizing: "border-box", borderRadius: 0,
    appearance: "none", WebkitAppearance: "none"
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(10,10,10,0.5)", zIndex: 100,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      backdropFilter: "blur(2px)"
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: T.white, width: "100%", maxWidth: 480,
        maxHeight: "92vh", overflowY: "auto", padding: "24px 24px 40px",
        borderTop: `2px solid ${T.black}`
      }}>
        {/* Handle */}
        <div style={{ width: 32, height: 2, background: T.line, margin: "0 auto 20px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontFamily: T.mono, color: T.black, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {note?.id ? "Editar repaso" : "Nuevo repaso"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: T.mid, fontFamily: T.mono, padding: 0 }}>×</button>
        </div>

        <label style={lbl}>Habitación / Zona</label>
        <select value={form.habitacion} onChange={e => setForm(f => ({ ...f, habitacion: e.target.value }))} style={inp}>
          {HABITACIONES.map(h => <option key={h}>{h}</option>)}
        </select>

        <label style={lbl}>Responsable</label>
        <select value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} style={inp}>
          {RESPONSABLES.map(r => <option key={r}>{r}</option>)}
        </select>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={lbl}>Estado</label>
            <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} style={inp}>
              {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Fecha</label>
            <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={inp} />
          </div>
        </div>

        <label style={lbl}>Descripción</label>
        <textarea
          value={form.comentario}
          onChange={e => setForm(f => ({ ...f, comentario: e.target.value }))}
          placeholder="Describe el defecto o incidencia…"
          rows={4}
          style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
        />

        <label style={lbl}>Fotografías</label>
        <button onClick={() => fileRef.current.click()} style={{
          width: "100%", padding: "12px", border: `1px dashed ${T.line}`,
          background: T.bg, color: T.mid, fontSize: 12, cursor: "pointer",
          fontFamily: T.mono, letterSpacing: "0.06em", textTransform: "uppercase"
        }}>
          + Añadir fotos
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFoto} />
        <PhotoGrid fotos={form.fotos} onRemove={removeFoto} />

        <div style={{ display: "flex", gap: 8, marginTop: 28 }}>
          {note?.id && (
            <button onClick={() => onDelete(note.id)} style={{
              padding: "13px 16px", border: `1px solid ${T.line}`,
              background: T.white, color: T.mid, cursor: "pointer",
              fontFamily: T.mono, fontSize: 12, letterSpacing: "0.05em"
            }}>Eliminar</button>
          )}
          <button onClick={() => onSave(form)} style={{
            flex: 1, padding: 13, border: "none",
            background: T.black, color: T.white, cursor: "pointer",
            fontFamily: T.mono, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase"
          }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ── Invite modal ──────────────────────────────────────────────────
function InviteModal({ obraTitle, onClose }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fake invite link (in a real app this would be a real deep-link/share URL)
  const inviteLink = `https://nula.studio/repasos/join?obra=${encodeURIComponent(obraTitle)}&token=demo1234`;

  const handleSend = () => {
    if (!email.trim()) return;
    setSent(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const lbl = {
    display: "block", fontSize: 10, fontFamily: T.mono, color: T.mid,
    letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, marginTop: 18
  };
  const inp = {
    width: "100%", padding: "10px 12px", border: `1px solid ${T.line}`,
    background: T.white, color: T.black, fontSize: 13, outline: "none",
    fontFamily: T.sans, boxSizing: "border-box", borderRadius: 0,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(10,10,10,0.5)", zIndex: 200,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      backdropFilter: "blur(2px)"
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: T.white, width: "100%", maxWidth: 480,
        maxHeight: "85vh", overflowY: "auto", padding: "24px 24px 40px",
        borderTop: `2px solid ${T.black}`
      }}>
        <div style={{ width: 32, height: 2, background: T.line, margin: "0 auto 20px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontFamily: T.mono, color: T.black, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Invitar cliente
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: T.mid, fontFamily: T.mono, padding: 0 }}>×</button>
        </div>

        <p style={{ fontSize: 12, fontFamily: T.sans, color: T.mid, margin: "0 0 4px", lineHeight: 1.6 }}>
          El cliente podrá ver los repasos de <strong style={{ color: T.black }}>{obraTitle}</strong>, añadir comentarios y subir fotos desde su móvil.
        </p>

        {/* Link de invitación */}
        <label style={lbl}>Enlace de acceso</label>
        <div style={{ display: "flex", gap: 0 }}>
          <div style={{
            flex: 1, padding: "10px 12px", border: `1px solid ${T.line}`, borderRight: "none",
            background: T.bg, fontSize: 11, fontFamily: T.mono, color: T.mid,
            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis"
          }}>
            {inviteLink}
          </div>
          <button onClick={handleCopy} style={{
            padding: "10px 14px", border: `1px solid ${T.line}`,
            background: copied ? T.black : T.white, color: copied ? T.white : T.black,
            fontSize: 11, fontFamily: T.mono, letterSpacing: "0.06em",
            cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap"
          }}>
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>

        {/* Compartir por WhatsApp */}
        <button
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Hola, te invito a revisar los repasos de obra de "${obraTitle}" en Nula.Studio:\n${inviteLink}`)}`, "_blank")}
          style={{
            width: "100%", marginTop: 10, padding: "11px 12px",
            border: `1px solid ${T.line}`, background: T.white,
            fontSize: 11, fontFamily: T.mono, letterSpacing: "0.06em",
            textTransform: "uppercase", cursor: "pointer", color: T.black,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8
          }}>
          <span style={{ fontSize: 15 }}>💬</span> Compartir por WhatsApp
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: T.line }} />
          <span style={{ fontSize: 10, fontFamily: T.mono, color: T.light, letterSpacing: "0.08em" }}>O POR EMAIL</span>
          <div style={{ flex: 1, height: 1, background: T.line }} />
        </div>

        {sent ? (
          <div style={{
            padding: "16px", border: `1px solid ${T.line}`, background: T.bg,
            textAlign: "center"
          }}>
            <div style={{ fontSize: 11, fontFamily: T.mono, color: T.black, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Invitación enviada
            </div>
            <div style={{ fontSize: 12, fontFamily: T.sans, color: T.mid, marginTop: 4 }}>
              {email}
            </div>
          </div>
        ) : (
          <>
            <label style={lbl}>Email del cliente</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="cliente@email.com"
              style={inp}
            />
            <button onClick={handleSend} style={{
              width: "100%", marginTop: 12, padding: 13, border: "none",
              background: T.black, color: T.white, cursor: "pointer",
              fontFamily: T.mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase"
            }}>
              Enviar invitación
            </button>
          </>
        )}

        {/* Info nota */}
        <p style={{ fontSize: 11, fontFamily: T.mono, color: T.light, marginTop: 18, lineHeight: 1.7, letterSpacing: "0.02em" }}>
          El cliente verá todos los repasos pero no podrá eliminarlos ni cambiar responsables. Puede añadir fotos y comentarios propios.
        </p>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────
export default function App() {
  const [notes, setNotes] = useState(initialNotes);
  const [modal, setModal] = useState(null);
  const [filtro, setFiltro] = useState("pendiente");
  const [search, setSearch] = useState("");
  const [obraTitle, setObraTitle] = useState("Reforma C/ Lagasca 14");
  const [editingTitle, setEditingTitle] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const titleRef = useRef();

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.background = T.bg;
  }, []);

  useEffect(() => {
    if (editingTitle && titleRef.current) titleRef.current.focus();
  }, [editingTitle]);

  const filtered = notes.filter(n => {
    const matchFiltro = n.estado === filtro;
    const matchSearch = !search ||
      n.habitacion.toLowerCase().includes(search.toLowerCase()) ||
      n.responsable.toLowerCase().includes(search.toLowerCase()) ||
      n.comentario.toLowerCase().includes(search.toLowerCase());
    return matchFiltro && matchSearch;
  });

  const handleSave = (form) => {
    if (form.id) setNotes(ns => ns.map(n => n.id === form.id ? form : n));
    else setNotes(ns => [...ns, { ...form, id: Date.now() }]);
    setModal(null);
  };

  const handleDelete = (id) => {
    setNotes(ns => ns.filter(n => n.id !== id));
    setModal(null);
  };

  const counts = {
    pendiente:  notes.filter(n => n.estado === "pendiente").length,
    en_proceso: notes.filter(n => n.estado === "en_proceso").length,
    resuelto:   notes.filter(n => n.estado === "resuelto").length,
  };

  const filtros = [
    { key: "pendiente",  label: "Pendiente"  },
    { key: "en_proceso", label: "En proceso" },
    { key: "resuelto",   label: "Resuelto"   },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, maxWidth: 480, margin: "0 auto", fontFamily: T.sans }}>

      {/* ── HEADER ── */}
      <div style={{ background: T.white, borderBottom: `1px solid ${T.line}`, padding: "40px 20px 0" }}>

        {/* Logotype + Invite */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
            <div style={{ fontSize: 22, fontFamily: T.sans, fontWeight: 400, color: T.black, letterSpacing: "-0.01em" }}>
              Nula.Studio
            </div>

            {/* Editable obra title */}
            {editingTitle ? (
              <input
                ref={titleRef}
                value={obraTitle}
                onChange={e => setObraTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => { if (e.key === "Enter") setEditingTitle(false); }}
                style={{
                  fontSize: 13, fontFamily: T.mono, color: T.black,
                  letterSpacing: "0.06em", marginTop: 3,
                  border: "none", borderBottom: `1px solid ${T.black}`,
                  background: "transparent", outline: "none", padding: "1px 0",
                  width: "100%", textTransform: "uppercase"
                }}
              />
            ) : (
              <div
                onClick={() => setEditingTitle(true)}
                style={{
                  fontSize: 13, fontFamily: T.mono, color: T.mid,
                  letterSpacing: "0.06em", marginTop: 3, cursor: "text",
                  textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5
                }}
              >
                {obraTitle}
                <span style={{ fontSize: 10, color: T.light, letterSpacing: 0 }}>✎</span>
              </div>
            )}
          </div>

          {/* Invite button — circular, black, custom person SVG */}
          <button
            onClick={() => setShowInvite(true)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              background: T.black, border: "none",
              borderRadius: "50%", width: 38, height: 38,
              cursor: "pointer", flexShrink: 0, padding: 0,
              justifyContent: "center",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="8" r="4" fill="white"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
              <line x1="19" y1="5" x2="23" y2="5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              <line x1="21" y1="3" x2="21" y2="7" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar…"
          style={{
            width: "100%", padding: "10px 0", border: "none", borderBottom: `1px solid ${T.line}`,
            background: "transparent", color: T.black, fontSize: 13, outline: "none",
            fontFamily: T.sans, boxSizing: "border-box"
          }}
        />

        {/* Filtros — sin "Todos" */}
        <div style={{ display: "flex", gap: 0, marginTop: 14 }}>
          {filtros.map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)} style={{
              flex: 1, padding: "9px 4px", border: "none",
              borderBottom: filtro === f.key ? `2px solid ${T.black}` : `2px solid transparent`,
              background: "transparent", color: filtro === f.key ? T.black : T.mid,
              fontSize: 10, fontFamily: T.mono, letterSpacing: "0.05em", textTransform: "uppercase",
              cursor: "pointer", transition: "color 0.1s"
            }}>
              {f.label}
              <span style={{ display: "block", fontSize: 13, fontFamily: T.mono, color: filtro === f.key ? T.black : T.light, marginTop: 1 }}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── LIST ── */}
      <div style={{ padding: "12px 16px 110px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 20px" }}>
            <div style={{ fontSize: 11, fontFamily: T.mono, color: T.light, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Sin repasos {ESTADOS[filtro]?.label.toLowerCase()}s
            </div>
          </div>
        ) : (
          <div style={{ border: `1px solid ${T.line}`, background: T.white }}>
            {filtered.map(note => (
              <NoteCard key={note.id} note={note} onEdit={setModal} filtro={filtro} />
            ))}
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, padding: "16px 16px 28px",
        background: "linear-gradient(transparent, rgba(248,248,246,0.97) 40%)",
        zIndex: 50
      }}>
        <button onClick={() => setModal({})} style={{
          width: "100%", padding: "15px 24px", border: "none",
          background: T.black, color: T.white, fontSize: 11,
          fontFamily: T.mono, letterSpacing: "0.12em", textTransform: "uppercase",
          cursor: "pointer"
        }}>
          + Nuevo repaso
        </button>
      </div>

      {/* ── MODAL REPASO ── */}
      {modal !== null && (
        <Modal
          note={modal?.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {/* ── MODAL INVITE ── */}
      {showInvite && (
        <InviteModal
          obraTitle={obraTitle}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}
