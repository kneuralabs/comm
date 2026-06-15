/* ════════════════════════════════════════════════════════════════
   OVERLAYS — settings · entity modal · in-app dialogs · command palette
   The dialogs replace native window.confirm / window.prompt.
   ════════════════════════════════════════════════════════════════ */
(function () {
const { useState: _useState, useEffect: _useEffect, useRef: _useRef, Fragment: _Fragment } = React;
const { Icon: _Icon, MLBL: _MLBL, Field: _Field, STATUS: _STATUS } = window.KN;
const _SANS = window.KN.SANS, _MONO = window.KN.MONO;

const _overlay = { position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px 20px calc(20px + env(safe-area-inset-bottom))", overflow:"auto", background:"rgba(8,14,24,0.5)", backdropFilter:"saturate(160%) blur(14px)", WebkitBackdropFilter:"saturate(160%) blur(14px)", animation:"fadeSlide 0.2s ease both" };

/* ── Settings panel ── */
const SettingsPanel = ({ onClose, onAddRole, onRenameRole, onToast }) => {
  const roles = (S.roles || []).map(name => ({ name, color: window.KN.roleColor(name), count: S.tasks.filter(t => t.role === name).length }));
  const online = _cloudStatus !== 'offline';
  const ghLbl = { fontSize:"var(--fs-overline)", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--text4)", marginBottom:4 };
  const secLbl = { fontSize:"var(--fs-overline)", fontWeight:700, letterSpacing:"var(--tracking-label)", textTransform:"uppercase", color:"var(--text4)" };
  return (
    <_Fragment>
      <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:199, background:"rgba(8,14,24,0.4)", backdropFilter:"blur(5px)", WebkitBackdropFilter:"blur(5px)", animation:"fadeSlide 0.2s ease both" }} />
      <div role="dialog" aria-label="Settings" style={{ position:"fixed", top:0, right:0, bottom:0, width:"min(340px, 88vw)", paddingTop:"env(safe-area-inset-top)", background:"var(--glass-bg)", backdropFilter:"var(--glass)", WebkitBackdropFilter:"var(--glass)", borderLeft:"1px solid var(--border2)", display:"flex", flexDirection:"column", zIndex:200, boxShadow:"var(--sh-3)", animation:"slideInRight 0.34s var(--ease-smooth) both" }}>
        <div style={{ height:54, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 18px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
          <span style={{ fontSize:"var(--fs-sm)", fontWeight:700, color:"var(--text)", letterSpacing:"0.02em" }}>Settings</span>
          <button onClick={onClose} aria-label="Close settings" className="kn-press kn-hit" style={{ width:32, height:32, borderRadius:"var(--r-xs)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--text3)", background:"transparent" }}><_Icon name="close" size={15} /></button>
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          <div style={{ padding:"16px 18px", borderBottom:"1px solid var(--border)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <span style={secLbl}>Roles</span>
              <button onClick={onAddRole} className="kn-press" style={{ display:"inline-flex", alignItems:"center", gap:4, height:26, padding:"0 10px", border:"1px solid var(--border)", borderRadius:"var(--r-xs)", fontSize:"var(--fs-2xs)", fontWeight:600, color:"var(--text3)", background:"transparent", cursor:"pointer", fontFamily:_SANS }}><_Icon name="plus" size={12} /> Add</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {roles.map(r => (
                <div key={r.name} style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 10px", borderRadius:"var(--r-sm)", border:"1px solid var(--border)", background:"var(--surface2)" }}>
                  <div style={{ width:9, height:9, borderRadius:"50%", background:r.color, flexShrink:0 }} />
                  <span style={{ flex:1, fontSize:"var(--fs-sm)", fontWeight:600, color:"var(--text)" }}>{r.name}</span>
                  <span className="kn-num" style={{ fontSize:"var(--fs-2xs)", color:"var(--text4)", minWidth:44, textAlign:"right" }}>{r.count} tasks</span>
                  <button onClick={() => onRenameRole(r.name)} aria-label={"Rename " + r.name} className="kn-press" style={{ background:"none", border:"none", color:"var(--text4)", cursor:"pointer", padding:"2px", display:"flex" }}><_Icon name="edit" size={13} /></button>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding:"16px 18px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <span style={secLbl}>Sync</span>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:online?"var(--green)":"var(--red)", animation:online?"pulseOpacity 2.5s ease infinite":"none" }} />
                <span style={{ fontSize:"var(--fs-2xs)", fontWeight:700, color:online?"var(--green)":"var(--red)" }}>{online?"Live":"Offline"}</span>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {[["Backend","Supabase"],["Project","brysartqcjylgqwmnjkk"],["Storage","comm_state · main"]].map(([label,value]) => (
                <div key={label} style={{ padding:"10px 12px", borderRadius:"var(--r-sm)", border:"1px solid var(--border)", background:"var(--surface2)" }}>
                  <div style={ghLbl}>{label}</div>
                  <div className="kn-num" style={{ fontSize:"var(--fs-xs)", fontWeight:600, color:"var(--text)", wordBreak:"break-all" }}>{value}</div>
                </div>
              ))}
              <div style={{ fontSize:"var(--fs-overline)", color:"var(--text4)", lineHeight:1.5, marginTop:2 }}>Changes save automatically to the cloud and sync across devices. No token needed.</div>
              <button onClick={() => { try { manualSave(); } catch(e) {} onToast && onToast("Synced"); }} className="kn-press" style={{ height:36, border:"none", borderRadius:"var(--r-sm)", fontSize:"var(--fs-xs)", fontWeight:700, color:"var(--accent-ink)", background:"var(--accent)", cursor:"pointer", fontFamily:_SANS, marginTop:2 }}>Sync now</button>
            </div>
          </div>
        </div>
      </div>
    </_Fragment>
  );
};

/* ── Generic entity modal (add / edit · task · project · payment · decision) ── */
const ENTITY_LABEL = { task:"Task", project:"Project", payment:"Payment", decision:"Decision" };
const EntityModal = ({ kind, item, projects, onClose, onSave, onDelete }) => {
  const blank = {
    task:     { title:"", status:"pending", role:(S.roles&&S.roles[0])||"CEO", project:(projects[0]&&projects[0].id)||"", due:"", nextAction:"", notes:"", priority:"medium" },
    project:  { name:"", role:"", desc:"" },
    payment:  { client:"", amount:"", due:"", status:"pending", notes:"" },
    decision: { note:"", date:today() },
  }[kind];
  const start = { ...blank, ...(item||{}) };
  if (kind === "decision" && item && item.ts) start.date = String(item.ts).slice(0,10);
  const [f, setF] = _useState(start);
  const set = (k, v) => setF(x => ({ ...x, [k]:v }));
  const isEdit = !!(item && item.id);

  const inp = { width:"100%", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"var(--r-sm)", color:"var(--text)", fontFamily:_SANS, fontSize:16, padding:"11px 13px", outline:"none", boxSizing:"border-box", transition:"border-color 0.15s, box-shadow 0.15s" };
  const sel = { ...inp, appearance:"none", cursor:"pointer" };
  const area = { ...inp, minHeight:64, resize:"vertical", lineHeight:1.5 };

  const valid =
    kind === "task"    ? (String(f.title).trim() && f.project) :
    kind === "project" ? String(f.name).trim() :
    kind === "payment" ? (String(f.client).trim() && String(f.amount).trim() !== "") :
                         String(f.note).trim();

  return (
    <div style={_overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" style={{ background:"var(--surface)", border:"1px solid var(--border2)", borderRadius:"var(--r-xl)", padding:26, width:"100%", maxWidth:472, boxShadow:"var(--sh-3)", position:"relative", overflow:"hidden", animation:"sheetUp 0.32s var(--ease-spring) both" }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"linear-gradient(90deg, hsl(var(--mood-h) 85% 56%), var(--accent))" }} />
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <span style={{ fontSize:"var(--fs-lg)", fontWeight:800, color:"var(--text)", letterSpacing:"-0.02em" }}>{isEdit ? "Edit " : "New "}{ENTITY_LABEL[kind]}</span>
          <button onClick={onClose} aria-label="Close" className="kn-press kn-hit" style={{ width:32, height:32, borderRadius:"var(--r-xs)", border:"none", background:"transparent", color:"var(--text3)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><_Icon name="close" size={17} /></button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:13 }}>

          {kind === "task" && (
            <_Fragment>
              <_Field label="Title"><input value={f.title} onChange={e => set("title", e.target.value)} placeholder="Task title…" style={inp} autoFocus /></_Field>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <_Field label="Status"><select value={f.status} onChange={e => set("status", e.target.value)} style={sel}>{Object.entries(_STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select></_Field>
                <_Field label="Role"><select value={f.role} onChange={e => set("role", e.target.value)} style={sel}>{(S.roles||[]).map(r => <option key={r}>{r}</option>)}</select></_Field>
                <_Field label="Project"><select value={f.project} onChange={e => set("project", e.target.value)} style={sel}>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></_Field>
                <_Field label="Due date"><input type="date" value={f.due} onChange={e => set("due", e.target.value)} style={inp} /></_Field>
              </div>
              <_Field label="Next action"><input value={f.nextAction} onChange={e => set("nextAction", e.target.value)} placeholder="What's the immediate next step?" style={inp} /></_Field>
              <_Field label="Notes"><textarea value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes…" style={area} /></_Field>
            </_Fragment>
          )}

          {kind === "project" && (
            <_Fragment>
              <_Field label="Name"><input value={f.name} onChange={e => set("name", e.target.value)} placeholder="Project name…" style={inp} autoFocus /></_Field>
              <_Field label="Owner role"><select value={f.role} onChange={e => set("role", e.target.value)} style={sel}><option value="">— none —</option>{(S.roles||[]).map(r => <option key={r}>{r}</option>)}</select></_Field>
              <_Field label="Description"><textarea value={f.desc} onChange={e => set("desc", e.target.value)} placeholder="Optional description…" style={area} /></_Field>
            </_Fragment>
          )}

          {kind === "payment" && (
            <_Fragment>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <_Field label="Client"><input value={f.client} onChange={e => set("client", e.target.value)} placeholder="Client name…" style={inp} autoFocus /></_Field>
                <_Field label="Amount ($)"><input type="number" inputMode="decimal" value={f.amount} onChange={e => set("amount", e.target.value)} placeholder="0" style={inp} /></_Field>
                <_Field label="Status"><select value={f.status} onChange={e => set("status", e.target.value)} style={sel}><option value="pending">Pending</option><option value="received">Received</option></select></_Field>
                <_Field label="Due date"><input type="date" value={f.due} onChange={e => set("due", e.target.value)} style={inp} /></_Field>
              </div>
              <_Field label="Notes"><input value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes…" style={inp} /></_Field>
            </_Fragment>
          )}

          {kind === "decision" && (
            <_Fragment>
              <_Field label="Decision"><textarea value={f.note} onChange={e => set("note", e.target.value)} placeholder="What was decided?" style={{ ...area, minHeight:90 }} autoFocus /></_Field>
              <_Field label="Date"><input type="date" value={f.date} onChange={e => set("date", e.target.value)} style={inp} /></_Field>
            </_Fragment>
          )}

          <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:4 }}>
            {isEdit && <button onClick={() => onDelete(item.id)} className="kn-press" style={{ display:"inline-flex", alignItems:"center", gap:6, height:42, padding:"0 16px", border:"1px solid var(--st-blocked-bd)", borderRadius:"var(--r-sm)", fontSize:"var(--fs-sm)", fontWeight:600, color:"var(--red)", background:"rgba(225,29,46,0.07)", cursor:"pointer", fontFamily:_SANS }}><_Icon name="trash" size={14} /> Delete</button>}
            <div style={{ flex:1 }} />
            <button onClick={onClose} className="kn-press" style={{ height:42, padding:"0 18px", border:"1px solid var(--border)", borderRadius:"var(--r-sm)", fontSize:"var(--fs-sm)", fontWeight:600, color:"var(--text2)", background:"transparent", cursor:"pointer", fontFamily:_SANS }}>Cancel</button>
            <button onClick={() => { if (valid) onSave({ ...f, id:item && item.id }); }} disabled={!valid} className="kn-press" style={{ height:42, padding:"0 22px", border:"none", borderRadius:"var(--r-sm)", fontSize:"var(--fs-sm)", fontWeight:700, color:"var(--accent-ink)", background:"var(--accent)", boxShadow:valid?"0 4px 16px hsl(var(--mood-h) 80% 45% / 0.35)":"none", cursor:valid?"pointer":"not-allowed", fontFamily:_SANS, opacity:valid ? 1 : 0.4, transition:"opacity 0.15s, box-shadow 0.15s" }}>{isEdit ? "Save" : "Add"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── In-app confirm (replaces window.confirm) ── */
const ConfirmDialog = ({ title, message, confirmLabel, danger, onResolve }) => {
  _useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onResolve(false); else if (e.key === "Enter") onResolve(true); };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, []);
  return (
    <div style={{ ..._overlay, zIndex:360 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onResolve(false); }}>
      <div role="alertdialog" aria-modal="true" style={{ background:"var(--surface)", border:"1px solid var(--border2)", borderRadius:"var(--r-xl)", padding:24, width:"100%", maxWidth:380, boxShadow:"var(--sh-3)", textAlign:"center", animation:"sheetUp 0.3s var(--ease-spring) both" }}>
        <div style={{ width:50, height:50, margin:"2px auto 14px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color: danger ? "var(--red)" : "var(--accent)", background: danger ? "rgba(225,29,46,0.10)" : "hsl(var(--mood-h) 80% 55% / 0.10)", animation:"popIn 0.34s var(--ease-spring) both" }}><_Icon name={danger ? "trash" : "spark"} size={22} /></div>
        <div style={{ fontSize:"var(--fs-lg)", fontWeight:700, color:"var(--text)", letterSpacing:"-0.02em", marginBottom:6 }}>{title}</div>
        {message && <div style={{ fontSize:"var(--fs-sm)", color:"var(--text3)", lineHeight:1.5, marginBottom:20 }}>{message}</div>}
        <div style={{ display:"flex", gap:9, marginTop:message?0:14 }}>
          <button onClick={() => onResolve(false)} className="kn-press" style={{ flex:1, height:42, border:"1px solid var(--border)", borderRadius:"var(--r-sm)", fontSize:"var(--fs-sm)", fontWeight:600, color:"var(--text2)", background:"transparent", cursor:"pointer", fontFamily:_SANS }}>Cancel</button>
          <button autoFocus onClick={() => onResolve(true)} className="kn-press" style={{ flex:1, height:42, border:"none", borderRadius:"var(--r-sm)", fontSize:"var(--fs-sm)", fontWeight:700, color:"#fff", background: danger ? "var(--red)" : "var(--accent)", cursor:"pointer", fontFamily:_SANS, boxShadow: danger ? "0 4px 16px rgba(225,29,46,0.35)" : "0 4px 16px hsl(var(--mood-h) 80% 45% / 0.35)" }}>{confirmLabel || (danger ? "Delete" : "Confirm")}</button>
        </div>
      </div>
    </div>
  );
};

/* ── In-app prompt (replaces window.prompt) ── */
const PromptDialog = ({ title, label, initial, placeholder, onResolve }) => {
  const [val, setVal] = _useState(initial || "");
  const ref = _useRef(null);
  _useEffect(() => { setTimeout(() => ref.current && ref.current.focus(), 40); }, []);
  const submit = () => onResolve(val.trim() ? val.trim() : null);
  return (
    <div style={{ ..._overlay, zIndex:360 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onResolve(null); }}>
      <div role="dialog" aria-modal="true" style={{ background:"var(--surface)", border:"1px solid var(--border2)", borderRadius:"var(--r-xl)", padding:24, width:"100%", maxWidth:400, boxShadow:"var(--sh-3)", animation:"sheetUp 0.3s var(--ease-spring) both" }}>
        <div style={{ fontSize:"var(--fs-lg)", fontWeight:700, color:"var(--text)", letterSpacing:"-0.02em", marginBottom:16 }}>{title}</div>
        <label style={_MLBL}>{label}</label>
        <input ref={ref} value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder||""}
          onKeyDown={e => { if (e.key === "Enter") submit(); else if (e.key === "Escape") onResolve(null); }}
          style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"var(--r-sm)", color:"var(--text)", fontFamily:_SANS, fontSize:16, padding:"11px 13px", outline:"none", boxSizing:"border-box" }} />
        <div style={{ display:"flex", gap:9, marginTop:18 }}>
          <button onClick={() => onResolve(null)} className="kn-press" style={{ flex:1, height:42, border:"1px solid var(--border)", borderRadius:"var(--r-sm)", fontSize:"var(--fs-sm)", fontWeight:600, color:"var(--text2)", background:"transparent", cursor:"pointer", fontFamily:_SANS }}>Cancel</button>
          <button onClick={submit} className="kn-press" style={{ flex:1, height:42, border:"none", borderRadius:"var(--r-sm)", fontSize:"var(--fs-sm)", fontWeight:700, color:"var(--accent-ink)", background:"var(--accent)", cursor:"pointer", fontFamily:_SANS, boxShadow:"0 4px 16px hsl(var(--mood-h) 80% 45% / 0.35)" }}>Save</button>
        </div>
      </div>
    </div>
  );
};

/* ── Command palette (⌘K · Mission Control) ── */
const CommandPalette = ({ actions, onClose }) => {
  const [q, setQ] = _useState("");
  const [sel, setSel] = _useState(0);
  const ref = _useRef(null);
  _useEffect(() => { setTimeout(() => ref.current && ref.current.focus(), 40); }, []);
  const filtered = actions.filter(a => {
    if (!q) return true;
    const s = (a.label + " " + (a.hint||"") + " " + (a.group||"")).toLowerCase();
    return q.toLowerCase().split(/\s+/).every(tok => s.includes(tok));
  });
  _useEffect(() => { setSel(0); }, [q]);
  const run = (a) => { if (!a) return; onClose(); setTimeout(() => a.run(), 0); };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(filtered.length-1, s+1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => Math.max(0, s-1)); }
    else if (e.key === "Enter") { e.preventDefault(); run(filtered[sel]); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };
  return (
    <div style={{ position:"fixed", inset:0, zIndex:380, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"20px", background:"rgba(8,14,24,0.5)", backdropFilter:"saturate(160%) blur(16px)", WebkitBackdropFilter:"saturate(160%) blur(16px)", animation:"fadeSlide 0.16s ease both" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="kn-palette" role="dialog" aria-label="Command palette" style={{ marginTop:"16vh", width:"100%", maxWidth:560, background:"var(--glass-bg)", backdropFilter:"var(--glass)", WebkitBackdropFilter:"var(--glass)", border:"1px solid var(--border2)", borderRadius:"var(--r-lg)", boxShadow:"var(--sh-3)", overflow:"hidden", animation:"sheetUp 0.26s var(--ease-spring) both" }}>
        <div style={{ display:"flex", alignItems:"center", gap:11, padding:"15px 18px", borderBottom:"1px solid var(--border)" }}>
          <_Icon name="search" size={18} style={{ color:"var(--text4)" }} />
          <input ref={ref} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search actions, jump to a view…"
            style={{ flex:1, border:"none", background:"transparent", color:"var(--text)", fontFamily:_SANS, fontSize:16, outline:"none" }} />
          <span style={{ fontFamily:_MONO, fontSize:"var(--fs-overline)", color:"var(--text4)", padding:"2px 6px", border:"1px solid var(--border)", borderRadius:5 }}>ESC</span>
        </div>
        <div style={{ maxHeight:"min(52vh, 420px)", overflowY:"auto", padding:"8px" }}>
          {filtered.length === 0 && <div style={{ padding:"26px", textAlign:"center", color:"var(--text4)", fontSize:"var(--fs-sm)" }}>No matching actions</div>}
          {filtered.map((a, i) => (
            <div key={a.id} onMouseEnter={() => setSel(i)} onClick={() => run(a)}
              style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 12px", borderRadius:"var(--r-sm)", cursor:"pointer", background: i===sel ? "hsl(var(--mood-h) 80% 55% / 0.12)" : "transparent", transition:"background 0.1s" }}>
              <div style={{ width:30, height:30, borderRadius:"var(--r-xs)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color: i===sel ? "var(--accent-hover)" : "var(--text3)", background:"var(--surface2)", border:"1px solid var(--border)" }}><_Icon name={a.icon||"spark"} size={15} /></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:"var(--fs-sm)", fontWeight:600, color:"var(--text)" }}>{a.label}</div>
                {a.hint && <div style={{ fontSize:"var(--fs-2xs)", color:"var(--text4)" }}>{a.hint}</div>}
              </div>
              {a.group && <span style={{ fontSize:"var(--fs-overline)", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--text4)" }}>{a.group}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

Object.assign(window.KN, { SettingsPanel, EntityModal, ENTITY_LABEL, ConfirmDialog, PromptDialog, CommandPalette });
})();
