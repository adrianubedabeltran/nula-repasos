import { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy,
  getDoc, setDoc
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDib48lcE1o1fEzx2MYOLyxHlamTHUHpIw",
  authDomain: "nula-repasos.firebaseapp.com",
  projectId: "nula-repasos",
  storageBucket: "nula-repasos.firebasestorage.app",
  messagingSenderId: "646660471688",
  appId: "1:646660471688:web:600f1e2b1addb6d879d83d",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Modo cliente: añade ?cliente a la URL para entrar en modo cliente ──
const IS_CLIENTE = new URLSearchParams(window.location.search).has("cliente");

const HABITACIONES = [
  "Salón","Cocina","Dormitorio principal","Dormitorio 2","Dormitorio 3",
  "Baño principal","Baño auxiliar","Pasillo","Terraza","Garaje",
  "Zona común","Fachada","Cubierta","Instalaciones",
  "Acceso","Escalera","Jardín","Buhardilla","Otro"
];
const RESPONSABLES = [
  "Electricista","Fontanero","Alicatador","Pintor","Carpintero",
  "Yesero","Solador","Instalador HVAC","Cristalero",
  "Carpintero de aluminio","Limpieza","Cerrajero","Tapicería","Nula Studio","Rares","Otro"
];
const ESTADOS = {
  pendiente:  { label: "Pendiente",  dot: "#000" },
  en_proceso: { label: "En proceso", dot: "#888" },
  resuelto:   { label: "Resuelto",   dot: "#ccc" },
};
const T = {
  sans:  "'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono:  "'Courier New', Courier, monospace",
  black: "#0A0A0A", mid: "#555", light: "#AAA",
  line:  "#E0E0E0", bg: "#F8F8F6", white: "#FFFFFF",
};

// ── Visor de foto a pantalla completa ─────────────────────────────
function PhotoViewer({ url, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 500,
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "zoom-out",
    }}>
      <img src={url} alt="" style={{
        maxWidth: "95vw", maxHeight: "90vh",
        objectFit: "contain", userSelect: "none",
      }} />
      <button onClick={onClose} style={{
        position: "absolute", top: 20, right: 20,
        background: "none", border: "none", color: "#fff",
        fontSize: 28, cursor: "pointer", lineHeight: 1,
        fontFamily: T.mono, opacity: 0.7,
      }}>×</button>
    </div>
  );
}

// ── PhotoGrid con click para ampliar ─────────────────────────────
function PhotoGrid({ fotos, onRemove, onView }) {
  if (!fotos?.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, marginTop: 10 }}>
      {fotos.map((f, i) => (
        <div key={i} style={{ position: "relative", aspectRatio: "1", overflow: "hidden", background: T.line }}>
          <img
            src={f.url} alt=""
            onClick={(e) => { e.stopPropagation(); onView && onView(f.url); }}
            style={{ width: "100%", height: "100%", objectFit: "cover", cursor: onView ? "zoom-in" : "default" }}
          />
          {onRemove && (
            <button onClick={(e) => { e.stopPropagation(); onRemove(i); }} style={{
              position: "absolute", top: 4, right: 4, background: T.white,
              border: `1px solid ${T.line}`, width: 20, height: 20, color: T.black,
              fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", lineHeight: 1, fontFamily: T.mono,
            }}>×</button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── NoteCard ──────────────────────────────────────────────────────
function NoteCard({ note, onEdit, onView }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={() => onEdit(note)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "#F2F2F0" : T.white,
        borderBottom: `1px solid ${T.line}`,
        padding: "12px 16px", cursor: "pointer",
        transition: "background 0.12s",
        display: "flex", flexDirection: "column", gap: 5,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 10, fontFamily: T.mono, color: T.black, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {note.habitacion}
        </span>
        <span style={{ fontSize: 10, fontFamily: T.mono, color: T.light, letterSpacing: "0.04em" }}>
          {note.responsable}
        </span>
      </div>
      <div style={{ fontSize: 13, fontFamily: T.sans, color: T.black, lineHeight: 1.55 }}>
        {note.comentario}
      </div>
      {note.fotos?.length > 0 && (
        <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 2, justifyContent: "flex-end" }}>
          {note.fotos.length > 4 && (
            <span style={{ fontSize: 10, fontFamily: T.mono, color: T.light }}>+{note.fotos.length - 4}</span>
          )}
          {note.fotos.slice(0, 4).map((f, i) => (
            <img key={i} src={f.url} alt="" style={{ width: 36, height: 36, objectFit: "cover", flexShrink: 0, borderRadius: "50%", filter: "grayscale(50%)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal repaso ──────────────────────────────────────────────────
function Modal({ note, onClose, onSave, onDelete, isCliente }) {
  const [form, setForm] = useState(note || {
    habitacion: HABITACIONES[0], responsable: RESPONSABLES[0],
    comentario: "", estado: "pendiente", fecha: new Date().toISOString().slice(0, 10), fotos: [],
  });
  const [saving, setSaving] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const fileRef = useRef();

  const handleFoto = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", "nula-repasos");
        fd.append("cloud_name", "dye8pd7tm");
        const res = await fetch("https://api.cloudinary.com/v1_1/dye8pd7tm/image/upload", {
          method: "POST", body: fd
        });
        const data = await res.json();
        const url = data.secure_url;
        setForm(f => ({ ...f, fotos: [...(f.fotos || []), { url, name: file.name }] }));
      } catch (err) {
        console.error("Error subiendo foto:", err);
      }
    }
  };

  const lbl = { display: "block", fontSize: 10, fontFamily: T.mono, color: T.mid, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, marginTop: 18 };
  const inp = { width: "100%", padding: "10px 12px", border: `1px solid ${T.line}`, background: T.white, color: T.black, fontSize: 13, outline: "none", fontFamily: T.sans, boxSizing: "border-box", borderRadius: 0, appearance: "none", WebkitAppearance: "none" };
  const inpReadonly = { ...inp, background: T.bg, color: T.mid, cursor: "default" };

  return (
    <>
      {viewingPhoto && <PhotoViewer url={viewingPhoto} onClose={() => setViewingPhoto(null)} />}
      <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.5)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(2px)" }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{ background: T.white, width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", padding: "24px 24px 40px", borderTop: `2px solid ${T.black}` }}>
          <div style={{ width: 32, height: 2, background: T.line, margin: "0 auto 20px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
            <span style={{ fontSize: 13, fontFamily: T.mono, color: T.black, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {note?.id ? (isCliente ? "Ver repaso" : "Editar repaso") : "Nuevo repaso"}
            </span>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: T.mid, fontFamily: T.mono, padding: 0 }}>×</button>
          </div>

          <label style={lbl}>Habitación / Zona</label>
          {isCliente && note?.id
            ? <div style={inpReadonly}>{form.habitacion}</div>
            : <select value={form.habitacion} onChange={e => setForm(f => ({ ...f, habitacion: e.target.value }))} style={inp}>
                {HABITACIONES.map(h => <option key={h}>{h}</option>)}
              </select>
          }

          <label style={lbl}>Responsable</label>
          {isCliente && note?.id
            ? <div style={inpReadonly}>{form.responsable}</div>
            : <select value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} style={inp}>
                {RESPONSABLES.map(r => <option key={r}>{r}</option>)}
              </select>
          }

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Estado</label>
              {isCliente && note?.id
                ? <div style={inpReadonly}>{ESTADOS[form.estado]?.label}</div>
                : <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} style={inp}>
                    {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
              }
            </div>
            <div>
              <label style={lbl}>Fecha</label>
              {isCliente && note?.id
                ? <div style={inpReadonly}>{form.fecha}</div>
                : <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={inp} />
              }
            </div>
          </div>

          <label style={lbl}>Descripción</label>
          {isCliente && note?.id
            ? <div style={{ ...inpReadonly, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{form.comentario}</div>
            : <textarea value={form.comentario} onChange={e => setForm(f => ({ ...f, comentario: e.target.value }))}
                placeholder="Describe el defecto o incidencia…" rows={4}
                style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
          }

          <label style={lbl}>Fotografías</label>
          <button onClick={() => fileRef.current.click()} style={{ width: "100%", padding: "12px", border: `1px dashed ${T.line}`, background: T.bg, color: T.mid, fontSize: 12, cursor: "pointer", fontFamily: T.mono, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            + Añadir fotos
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFoto} />
          <PhotoGrid
            fotos={form.fotos || []}
            onRemove={i => setForm(f => ({ ...f, fotos: f.fotos.filter((_, idx) => idx !== i) }))}
            onView={url => setViewingPhoto(url)}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 28 }}>
            {note?.id && !isCliente && (
              <button onClick={() => onDelete(note.id)} style={{ padding: "13px 16px", border: `1px solid ${T.line}`, background: T.white, color: T.mid, cursor: "pointer", fontFamily: T.mono, fontSize: 12 }}>
                Eliminar
              </button>
            )}
            <button
              onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }}
              disabled={saving}
              style={{ flex: 1, padding: 13, border: "none", background: T.black, color: T.white, cursor: saving ? "wait" : "pointer", fontFamily: T.mono, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── InviteModal ───────────────────────────────────────────────────
function InviteModal({ obraTitle, onClose }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  // Enlace modo cliente: misma URL + ?cliente
  const inviteLink = `${window.location.origin}?cliente`;

  const lbl = { display: "block", fontSize: 10, fontFamily: T.mono, color: T.mid, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, marginTop: 18 };
  const inp = { width: "100%", padding: "10px 12px", border: `1px solid ${T.line}`, background: T.white, color: T.black, fontSize: 13, outline: "none", fontFamily: T.sans, boxSizing: "border-box", borderRadius: 0 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(2px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: T.white, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", padding: "24px 24px 40px", borderTop: `2px solid ${T.black}` }}>
        <div style={{ width: 32, height: 2, background: T.line, margin: "0 auto 20px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontFamily: T.mono, color: T.black, letterSpacing: "0.06em", textTransform: "uppercase" }}>Invitar cliente</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: T.mid, fontFamily: T.mono, padding: 0 }}>×</button>
        </div>
        <p style={{ fontSize: 12, fontFamily: T.sans, color: T.mid, margin: "0 0 4px", lineHeight: 1.6 }}>
          El cliente verá los repasos de <strong style={{ color: T.black }}>{obraTitle}</strong> y podrá añadir nuevos, pero no editar los existentes.
        </p>

        <label style={lbl}>Enlace de acceso para clientes</label>
        <div style={{ display: "flex" }}>
          <div style={{ flex: 1, padding: "10px 12px", border: `1px solid ${T.line}`, borderRight: "none", background: T.bg, fontSize: 11, fontFamily: T.mono, color: T.mid, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
            {inviteLink}
          </div>
          <button onClick={() => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            style={{ padding: "10px 14px", border: `1px solid ${T.line}`, background: copied ? T.black : T.white, color: copied ? T.white : T.black, fontSize: 11, fontFamily: T.mono, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}>
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>

        <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Acceso a repasos de obra "${obraTitle}":\n${inviteLink}`)}`, "_blank")}
          style={{ width: "100%", marginTop: 10, padding: "11px 12px", border: `1px solid ${T.line}`, background: T.white, fontSize: 11, fontFamily: T.mono, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", color: T.black, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 15 }}>💬</span> Compartir por WhatsApp
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: T.line }} />
          <span style={{ fontSize: 10, fontFamily: T.mono, color: T.light, letterSpacing: "0.08em" }}>O POR EMAIL</span>
          <div style={{ flex: 1, height: 1, background: T.line }} />
        </div>

        {sent ? (
          <div style={{ padding: "16px", border: `1px solid ${T.line}`, background: T.bg, textAlign: "center" }}>
            <div style={{ fontSize: 11, fontFamily: T.mono, color: T.black, letterSpacing: "0.06em", textTransform: "uppercase" }}>Invitación enviada</div>
            <div style={{ fontSize: 12, fontFamily: T.sans, color: T.mid, marginTop: 4 }}>{email}</div>
          </div>
        ) : (
          <>
            <label style={lbl}>Email del cliente</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@email.com" style={inp} />
            <button onClick={() => { if (email.trim()) setSent(true); }}
              style={{ width: "100%", marginTop: 12, padding: 13, border: "none", background: T.black, color: T.white, cursor: "pointer", fontFamily: T.mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Enviar invitación
            </button>
          </>
        )}
        <p style={{ fontSize: 11, fontFamily: T.mono, color: T.light, marginTop: 18, lineHeight: 1.7 }}>
          El cliente puede ver y añadir repasos, pero no editar ni eliminar los existentes ni cambiar el título de la obra.
        </p>
      </div>
    </div>
  );
}

// ── Generador de informe PDF ──────────────────────────────────────
async function generarInforme(notes, obraTitle) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, margin = 16, contentW = W - margin * 2;
  let y = 20;

  const checkPage = (needed = 10) => {
    if (y + needed > 280) { doc.addPage(); y = 20; }
  };

  // Header
  doc.setFont("helvetica", "normal");
  doc.setFontSize(18);
  doc.setTextColor(10, 10, 10);
  doc.text("Nula.Studio", margin, y);
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(obraTitle.toUpperCase(), margin, y);
  doc.text(`Informe de repasos — ${new Date().toLocaleDateString("es-ES")}`, W - margin, y, { align: "right" });
  y += 5;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, W - margin, y);
  y += 8;

  // Solo pendientes, agrupados por responsable
  const pendientes = notes.filter(n => n.estado === "pendiente");
  const porResponsable = {};
  pendientes.forEach(n => {
    const r = n.responsable || "Sin asignar";
    if (!porResponsable[r]) porResponsable[r] = [];
    porResponsable[r].push(n);
  });

  if (Object.keys(porResponsable).length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(150,150,150);
    doc.text("No hay repasos pendientes.", margin, y);
  }

  for (const [responsable, repasos] of Object.entries(porResponsable)) {
    checkPage(16);

    // Responsable header
    doc.setFillColor(10, 10, 10);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(responsable.toUpperCase(), margin + 3, y + 5);
    doc.setTextColor(200, 200, 200);
    doc.text(`${repasos.length} repaso${repasos.length > 1 ? "s" : ""}`, W - margin - 3, y + 5, { align: "right" });
    y += 10;

    for (const note of repasos) {
      const hasPhoto = note.fotos?.length > 0;
      const photoW = hasPhoto ? 28 : 0;
      const textW = contentW - photoW - (hasPhoto ? 4 : 0);

      // Estimate text height
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(note.comentario || "", textW);
      const blockH = Math.max(hasPhoto ? 22 : 0, 6 + lines.length * 4 + 4);
      checkPage(blockH + 4);

      // Card background
      doc.setFillColor(250, 250, 248);
      doc.rect(margin, y, contentW, blockH, "F");
      doc.setDrawColor(224, 224, 224);
      doc.rect(margin, y, contentW, blockH);

      // Habitación
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(10, 10, 10);
      doc.text((note.habitacion || "").toUpperCase(), margin + 3, y + 5);

      // Fecha alineada a la derecha del texto
      doc.setFont("helvetica", "normal");
      doc.setTextColor(170, 170, 170);
      doc.text(note.fecha || "", margin + textW, y + 5, { align: "right" });

      // Comentario
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(8);
      doc.text(lines, margin + 3, y + 10);

      // Foto en B&W (si existe)
      if (hasPhoto) {
        try {
          const imgUrl = note.fotos[0].url;
          // Cargar imagen como base64 via canvas para B&W
          const imgEl = await new Promise((res, rej) => {
            const i = new Image(); i.crossOrigin = "anonymous";
            i.onload = () => res(i); i.onerror = rej;
            i.src = imgUrl;
          });
          const canvas = document.createElement("canvas");
          canvas.width = imgEl.naturalWidth; canvas.height = imgEl.naturalHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(imgEl, 0, 0);
          // Convertir a B&W
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          for (let p = 0; p < imgData.data.length; p += 4) {
            const gray = imgData.data[p] * 0.299 + imgData.data[p+1] * 0.587 + imgData.data[p+2] * 0.114;
            imgData.data[p] = imgData.data[p+1] = imgData.data[p+2] = gray;
          }
          ctx.putImageData(imgData, 0, 0);
          const b64 = canvas.toDataURL("image/jpeg", 0.7);
          const imgX = margin + textW + 4;
          doc.addImage(b64, "JPEG", imgX + 1, y + 1, photoW - 2, blockH - 2);
        } catch(e) { /* imagen no disponible */ }
      }

      y += blockH + 2;
    }
    y += 6;
  }

  // Footer en cada página
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text("Nula.Studio — Informe de repasos pendientes", margin, 290);
    doc.text(`${p} / ${totalPages}`, W - margin, 290, { align: "right" });
  }

  doc.save(`repasos-${obraTitle.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  const [notes, setNotes]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState(null);
  const [filtro, setFiltro]             = useState("pendiente");
  const [search, setSearch]             = useState("");
  const [obraTitle, setObraTitle]       = useState("Reforma C/ Lagasca 14");
  const obraRef = doc(db, "config", "obra");
  const [editingTitle, setEditingTitle] = useState(false);
  const [showInvite, setShowInvite]     = useState(false);
  const titleRef = useRef();

  useEffect(() => {
    const q = query(collection(db, "repasos"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    // Cargar título de obra desde Firestore
    getDoc(doc(db, "config", "obra")).then(d => {
      if (d.exists() && d.data().titulo) setObraTitle(d.data().titulo);
    });
    return unsub;
  }, []);

  useEffect(() => { document.body.style.margin = "0"; document.body.style.background = T.bg; }, []);
  useEffect(() => { if (editingTitle && titleRef.current) titleRef.current.focus(); }, [editingTitle]);

  const handleSave = async (form) => {
    if (form.id) {
      const { id, ...data } = form;
      await updateDoc(doc(db, "repasos", id), { ...data, updatedAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, "repasos"), { ...form, createdAt: serverTimestamp() });
    }
    setModal(null);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "repasos", id));
    setModal(null);
  };

  // En modo cliente: al abrir una tarjeta existente solo puede ver (no editar)
  // pero puede crear nuevas
  const handleEditCard = (note) => {
    setModal(note);
  };

  const filtered = notes.filter(n => {
    const matchFiltro = n.estado === filtro;
    const matchSearch = !search ||
      n.habitacion?.toLowerCase().includes(search.toLowerCase()) ||
      n.responsable?.toLowerCase().includes(search.toLowerCase()) ||
      n.comentario?.toLowerCase().includes(search.toLowerCase());
    return matchFiltro && matchSearch;
  });

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

      {/* HEADER */}
      <div style={{ background: T.white, borderBottom: `1px solid ${T.line}`, padding: "40px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
            <div style={{ fontSize: 22, fontFamily: T.sans, fontWeight: 400, color: T.black, letterSpacing: "-0.01em" }}>
              Nula.Studio
            </div>
            {/* Solo editable en modo estudio, no cliente */}
            {!IS_CLIENTE ? (
              editingTitle ? (
                <input ref={titleRef} value={obraTitle} onChange={e => setObraTitle(e.target.value)}
                  onBlur={async () => { setEditingTitle(false); await setDoc(doc(db, "config", "obra"), { titulo: obraTitle }); }} onKeyDown={async (e) => { if (e.key === "Enter") { setEditingTitle(false); await setDoc(doc(db, "config", "obra"), { titulo: obraTitle }); } }}
                  style={{ fontSize: 13, fontFamily: T.mono, color: T.black, letterSpacing: "0.06em", marginTop: 3, border: "none", borderBottom: `1px solid ${T.black}`, background: "transparent", outline: "none", padding: "1px 0", width: "100%", textTransform: "uppercase" }} />
              ) : (
                <div onClick={() => setEditingTitle(true)} style={{ fontSize: 13, fontFamily: T.mono, color: T.mid, letterSpacing: "0.06em", marginTop: 3, cursor: "text", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
                  {obraTitle}<span style={{ fontSize: 10, color: T.light }}>✎</span>
                </div>
              )
            ) : (
              <div style={{ fontSize: 13, fontFamily: T.mono, color: T.mid, letterSpacing: "0.06em", marginTop: 3, textTransform: "uppercase" }}>
                {obraTitle}
              </div>
            )}
          </div>

          {/* Botón invitar solo en modo estudio */}
          {!IS_CLIENTE && (
            <button onClick={() => setShowInvite(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", background: T.black, border: "none", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", flexShrink: 0, padding: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" fill="white"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                <line x1="19" y1="5" x2="23" y2="5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="21" y1="3" x2="21" y2="7" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          )}

          {/* Indicador modo cliente */}
          {IS_CLIENTE && (
            <div style={{ fontSize: 9, fontFamily: T.mono, color: T.light, letterSpacing: "0.06em", textTransform: "uppercase", border: `1px solid ${T.line}`, padding: "4px 8px", flexShrink: 0 }}>
              Cliente
            </div>
          )}
        </div>

        {/* Botón informe PDF */}
        <button
          onClick={() => generarInforme(notes, obraTitle)}
          style={{
            width: "100%", marginBottom: 12,
            padding: "9px 14px", border: `1px solid ${T.line}`,
            background: T.white, color: T.mid, cursor: "pointer",
            fontFamily: T.mono, fontSize: 10, letterSpacing: "0.08em",
            textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6
          }}>
          <span style={{ fontSize: 13 }}>↓</span> Generar informe pendientes
        </button>

        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…"
          style={{ width: "100%", padding: "10px 0", border: "none", borderBottom: `1px solid ${T.line}`, background: "transparent", color: T.black, fontSize: 13, outline: "none", fontFamily: T.sans, boxSizing: "border-box" }} />

        <div style={{ display: "flex", marginTop: 14 }}>
          {filtros.map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)} style={{ flex: 1, padding: "9px 4px", border: "none", borderBottom: filtro === f.key ? `2px solid ${T.black}` : "2px solid transparent", background: "transparent", color: filtro === f.key ? T.black : T.mid, fontSize: 10, fontFamily: T.mono, letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer", transition: "color 0.1s" }}>
              {f.label}
              <span style={{ display: "block", fontSize: 13, fontFamily: T.mono, color: filtro === f.key ? T.black : T.light, marginTop: 1 }}>{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* LIST */}
      <div style={{ padding: "12px 16px 110px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "64px 20px" }}>
            <div style={{ fontSize: 11, fontFamily: T.mono, color: T.light, letterSpacing: "0.1em", textTransform: "uppercase" }}>Cargando…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 20px" }}>
            <div style={{ fontSize: 11, fontFamily: T.mono, color: T.light, letterSpacing: "0.1em", textTransform: "uppercase" }}>Sin repasos {ESTADOS[filtro]?.label.toLowerCase()}s</div>
          </div>
        ) : (
          <div style={{ border: `1px solid ${T.line}`, background: T.white }}>
            {filtered.map(note => <NoteCard key={note.id} note={note} onEdit={handleEditCard} />)}
          </div>
        )}
      </div>

      {/* FAB — visible para todos */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, padding: "16px 16px 28px", background: "linear-gradient(transparent, rgba(248,248,246,0.97) 40%)", zIndex: 50 }}>
        <button onClick={() => setModal({})} style={{ width: "100%", padding: "15px 24px", border: "none", background: T.black, color: T.white, fontSize: 11, fontFamily: T.mono, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}>
          + Nuevo repaso
        </button>
      </div>

      {modal !== null && (
        <Modal
          note={modal?.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          isCliente={IS_CLIENTE}
        />
      )}

      {showInvite && <InviteModal obraTitle={obraTitle} onClose={() => setShowInvite(false)} />}
    </div>
  );
}
