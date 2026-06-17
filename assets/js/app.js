/* ════════════════════════════════════════════════════════════════
   APP — composition root: chrome, routing, mutations, dialogs, palette
   ════════════════════════════════════════════════════════════════ */
(function () {
const { useState: uS, useEffect: uE, useReducer: uR, useRef: uRef } = React;
const K = window.KN;
const {
  Icon, AnimatedNumber, StatusBadge, TasksView, ProjectsView, PaymentsView, DecisionsView,
  SettingsPanel, EntityModal, ENTITY_LABEL, ConfirmDialog, PromptDialog, CommandPalette,
  STATUS, FALLBACK_PALETTE, fmtMoneyShort, Kbd,
} = K;
const APP_SANS = K.SANS, APP_MONO = K.MONO;

const App = () => {
  const [, force] = uR(x => x + 1, 0);
  const [ready, setReady] = uS(false);
  const [dark, setDark] = uS(document.documentElement.getAttribute("data-theme") !== "light");
  const [tab, setTab] = uS("tasks");
  const [settingsOpen, setSettingsOpen] = uS(false);
  const [modal, setModal] = uS(null);
  const [filter, setFilter] = uS("all");
  const [search, setSearch] = uS("");
  const [toastMsg, setToastMsg] = uS(null);
  const [paletteOpen, setPaletteOpen] = uS(false);
  const [dialog, setDialog] = uS(null);
  const resolver = uRef(null);

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 2000); };
  const commit = () => { save(); K.applyMood(); force(); };

  // Promise-based dialogs (replace native confirm/prompt)
  const askConfirm = (opts) => new Promise(res => { resolver.current = res; setDialog({ type:"confirm", props:opts }); });
  const askPrompt  = (opts) => new Promise(res => { resolver.current = res; setDialog({ type:"prompt",  props:opts }); });
  const resolveDialog = (v) => { const r = resolver.current; resolver.current = null; setDialog(null); if (r) r(v); };

  // Boot
  uE(() => {
    window.__toast = showToast;
    window.__refresh = () => { K.applyMood(); force(); };
    window.__flashSave = () => {};
    (async () => { await load(); K.applyMood(); setReady(true); force(); })();
    const sync = setInterval(() => { _syncFromCloud(); }, 30000);
    return () => { clearInterval(sync); window.__toast = null; window.__refresh = null; window.__flashSave = null; };
  }, []);

  // Theme
  uE(() => {
    const th = dark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", th);
    try { localStorage.setItem("theme", th); } catch(e) {}
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = dark ? "#07111e" : "#eef1f6";
  }, [dark]);

  // Derived
  const tasks = S.tasks || [];
  const openCount = tasks.filter(t => t.status !== "done").length;
  const overdueCount = tasks.filter(t => K.urgencyOf(t) === "overdue").length;
  const blockedCount = tasks.filter(t => t.status === "blocked").length;
  const autoRev = (S.payments||[]).filter(p => p.status === "received").reduce((s,p)=>s+Number(p.amount||0),0);
  const revenue = S.revenueAuto ? autoRev : (S.revenue || 0);

  // Keep the living surface in sync with health
  uE(() => { K.applyMood(); }, [openCount, overdueCount, blockedCount, revenue, (S.payments||[]).length]);

  // Mutations
  const onStatusChange = (id, next) => { S.tasks = S.tasks.map(t => t.id === id ? { ...t, status:next } : t); commit(); showToast(STATUS[next]?.label); };
  const onDeleteTask = async (id) => { if (!(await askConfirm({ title:"Delete task?", message:"This task will be permanently removed.", danger:true }))) return; S.tasks = S.tasks.filter(t => t.id !== id); commit(); showToast("Task deleted"); };

  const saveTask = (f) => {
    if (f.id) { S.tasks = S.tasks.map(t => t.id === f.id ? { ...t, title:f.title.trim(), status:f.status, role:f.role, project:f.project, priority:f.priority||"medium", due:f.due, nextAction:f.nextAction, notes:f.notes||"" } : t); showToast("Task updated"); }
    else { S.tasks = [{ id:uid(), title:f.title.trim(), role:f.role, project:f.project, priority:f.priority||"medium", status:f.status, due:f.due, nextAction:f.nextAction, notes:f.notes||"", created:new Date().toISOString() }, ...S.tasks]; showToast("Task added"); }
    commit();
  };
  const saveProject = (f) => {
    if (f.id) { S.projects = S.projects.map(p => p.id === f.id ? { ...p, name:f.name.trim(), role:f.role, desc:f.desc } : p); showToast("Project updated"); }
    else { S.projects = [{ id:uid(), name:f.name.trim(), role:f.role, desc:f.desc }, ...S.projects]; showToast("Project added"); }
    commit();
  };
  const deleteProject = async (id) => {
    const n = (S.tasks||[]).filter(t => t.project === id).length;
    if (!(await askConfirm({ title:"Delete project?", message:`This project${n ? ` and its ${n} task${n>1?"s":""}` : ""} will be permanently removed.`, danger:true }))) return;
    S.projects = (S.projects||[]).filter(p => p.id !== id);
    S.tasks = (S.tasks||[]).filter(t => t.project !== id);
    commit(); showToast("Project deleted");
  };
  const savePayment = (f) => {
    if (f.id) { S.payments = S.payments.map(p => p.id === f.id ? { ...p, client:f.client.trim(), amount:f.amount, due:f.due, status:f.status, notes:f.notes } : p); showToast("Payment updated"); }
    else { S.payments = [{ id:uid(), client:f.client.trim(), amount:f.amount, due:f.due, status:f.status||"pending", notes:f.notes }, ...(S.payments||[])]; showToast("Payment added"); }
    commit();
  };
  const deletePayment = async (id) => { if (!(await askConfirm({ title:"Delete payment?", message:"This payment record will be permanently removed.", danger:true }))) return; S.payments = (S.payments||[]).filter(p => p.id !== id); commit(); showToast("Payment deleted"); };
  const saveDecision = (f) => {
    const ts = f.date ? new Date(f.date).toISOString() : (f.ts || new Date().toISOString());
    if (f.id) { S.decisions = S.decisions.map(d => d.id === f.id ? { ...d, note:f.note.trim(), ts } : d); showToast("Decision updated"); }
    else { S.decisions = [{ id:uid(), ts, note:f.note.trim() }, ...(S.decisions||[])]; showToast("Decision logged"); }
    commit();
  };
  const deleteDecision = async (id) => { if (!(await askConfirm({ title:"Delete decision?", message:"This entry will be permanently removed.", danger:true }))) return; S.decisions = (S.decisions||[]).filter(d => d.id !== id); commit(); showToast("Decision deleted"); };

  const saveEntity = (kind, f) => ({ task:saveTask, project:saveProject, payment:savePayment, decision:saveDecision }[kind])(f);
  const deleteEntity = (kind, id) => ({ task:onDeleteTask, project:deleteProject, payment:deletePayment, decision:deleteDecision }[kind])(id);

  const startNew = () => {
    if (tab === "tasks") {
      if (!(S.projects||[]).length) { showToast("Create a project first"); setModal({ kind:"project" }); return; }
      setModal({ kind:"task" });
    } else { setModal({ kind: tab.slice(0, -1) }); }
  };

  const onTogglePayment = (id) => { S.payments = S.payments.map(p => p.id === id ? { ...p, status: p.status === "received" ? "pending" : "received" } : p); commit(); };
  const onAddRole = async () => {
    const name = ((await askPrompt({ title:"Add role", label:"Role name", placeholder:"e.g. CTO" })) || "").trim();
    if (!name) return;
    if ((S.roles||[]).includes(name)) { showToast("Role already exists"); return; }
    S.roles = [...(S.roles||[]), name];
    S.roleColors = { ...(S.roleColors||{}), [name]: FALLBACK_PALETTE[(S.roles.length-1) % FALLBACK_PALETTE.length] };
    commit(); showToast("Role added");
  };
  const onRenameRole = async (oldName) => {
    const name = ((await askPrompt({ title:"Rename role", label:"Role name", initial:oldName })) || "").trim();
    if (!name || name === oldName) return;
    S.roles = (S.roles||[]).map(r => r === oldName ? name : r);
    if (S.roleColors && S.roleColors[oldName]) { S.roleColors[name] = S.roleColors[oldName]; delete S.roleColors[oldName]; }
    S.tasks = S.tasks.map(t => t.role === oldName ? { ...t, role:name } : t);
    commit(); showToast("Role renamed");
  };

  // Keyboard shortcuts
  uE(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen(o => !o); return; }
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") { if (e.key === "Escape") e.target.blur(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); manualSave(); showToast("Saved"); }
      else if (e.key === "n" && !e.metaKey && !e.ctrlKey) { startNew(); }
      else if (e.key === "/") { e.preventDefault(); const el = document.getElementById("kn-search"); if (el) el.focus(); }
      else if (e.key === "Escape") { setSettingsOpen(false); setModal(null); setPaletteOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const TABS = [
    { key:"tasks",     label:"Tasks",     count:tasks.length,            icon:"tasks" },
    { key:"projects",  label:"Projects",  count:(S.projects||[]).length, icon:"projects" },
    { key:"payments",  label:"Payments",  count:"",                      icon:"payments" },
    { key:"decisions", label:"Decisions", count:(S.decisions||[]).length, icon:"decisions" },
  ];

  const metrics = [
    { l:"Open",      v:openCount,                c:"var(--text)"   },
    { l:"Overdue",   v:overdueCount,             c:"var(--red)"    },
    { l:"Blocked",   v:blockedCount,             c:"var(--orange)" },
    { l:"Revenue",   v:fmtMoneyShort(revenue),   c:"var(--green)"  },
    { l:"Decisions", v:(S.decisions||[]).length, c:"var(--text)"   },
  ];

  // Command palette actions
  const goto = (k) => { setTab(k); setFilter("all"); setSearch(""); };
  const paletteActions = [
    { id:"new", label:`New ${ENTITY_LABEL[tab.slice(0,-1)]}`, hint:"Create in the current view", icon:"plus", group:"Create", run:startNew },
    { id:"new-task", label:"New Task", icon:"tasks", group:"Create", run:() => { goto("tasks"); startNew(); } },
    { id:"new-project", label:"New Project", icon:"projects", group:"Create", run:() => setModal({ kind:"project" }) },
    { id:"new-payment", label:"New Payment", icon:"payments", group:"Create", run:() => setModal({ kind:"payment" }) },
    { id:"new-decision", label:"New Decision", icon:"decisions", group:"Create", run:() => setModal({ kind:"decision" }) },
    { id:"go-tasks", label:"Go to Tasks", icon:"tasks", group:"Navigate", run:() => goto("tasks") },
    { id:"go-projects", label:"Go to Projects", icon:"projects", group:"Navigate", run:() => goto("projects") },
    { id:"go-payments", label:"Go to Payments", icon:"payments", group:"Navigate", run:() => goto("payments") },
    { id:"go-decisions", label:"Go to Decisions", icon:"decisions", group:"Navigate", run:() => goto("decisions") },
    { id:"f-overdue", label:"Filter: Overdue tasks", icon:"search", group:"View", run:() => { goto("tasks"); setFilter("overdue"); } },
    { id:"f-blocked", label:"Filter: Blocked tasks", icon:"search", group:"View", run:() => { goto("tasks"); setFilter("blocked"); } },
    { id:"theme", label:dark ? "Switch to light appearance" : "Switch to dark appearance", icon:dark?"sun":"moon", group:"View", run:() => setDark(d => !d) },
    { id:"settings", label:"Open Settings", icon:"gear", group:"View", run:() => setSettingsOpen(true) },
    { id:"save", label:"Save now", icon:"spark", group:"View", run:() => { manualSave(); showToast("Saved"); } },
  ];

  if (!ready) {
    return (
      <div style={{ height:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:18, background:"var(--bg)" }}>
        <img src="LOGO.png" alt="Kneura" style={{ height:52, width:52, borderRadius:14, objectFit:"cover", boxShadow:"var(--sh-2)" }} />
        <div className="kn-spin" style={{ width:22, height:22, borderRadius:"50%", border:"2.5px solid var(--border2)", borderTopColor:"var(--accent)" }} />
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="kn-aurora" aria-hidden="true" />
      <div className="kn-grain" aria-hidden="true" />

      <div className="theme-transition" style={{ position:"relative", zIndex:2, height:"100dvh", display:"flex", flexDirection:"column", overflow:"hidden", background:"transparent" }}>

        {/* HEADER */}
        <div className="kn-header" style={{ height:64, borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", padding:"0 32px", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <img src="LOGO.png" alt="Kneura" style={{ height:34, width:34, borderRadius:10, objectFit:"cover", display:"block", boxShadow:"var(--sh-1)" }} />
            <div>
              <div style={{ fontWeight:800, fontSize:"var(--fs-base)", letterSpacing:"-0.01em", lineHeight:1, display:"flex", alignItems:"baseline", gap:1 }}>
                <span style={{ color:"var(--text)" }}>Kneura</span>
                <span style={{ color:"var(--accent)" }}>COMM</span>
                <span style={{ fontSize:8, color:"var(--text4)", marginLeft:1, lineHeight:1 }}>™</span>
              </div>
              <div className="kn-subtitle" style={{ fontSize:"var(--fs-overline)", color:"var(--text4)", letterSpacing:"0.07em", textTransform:"uppercase", fontWeight:600, marginTop:3 }}>Command Centre</div>
            </div>
          </div>
          <div className="kn-divider" style={{ width:1, height:34, background:"var(--border)", margin:"0 22px", flexShrink:0 }} />
          <div className="kn-metrics" style={{ display:"flex", gap:26, flex:1, alignItems:"center" }}>
            {metrics.map(m => (
              <div key={m.l} style={{ display:"flex", flexDirection:"column", gap:2, cursor:"default" }}>
                <div style={{ fontSize:"var(--fs-overline)", fontWeight:700, letterSpacing:"0.13em", textTransform:"uppercase", color:"var(--text4)", whiteSpace:"nowrap" }}>{m.l}</div>
                <AnimatedNumber value={m.v} className="kn-num" style={{ fontSize:"var(--fs-2xl)", fontWeight:800, color:m.c, lineHeight:1, letterSpacing:"-0.04em" }} />
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:7, alignItems:"center", flexShrink:0 }}>
            <button className="kn-newtask kn-press" onClick={startNew} style={{ display:"inline-flex", alignItems:"center", gap:6, height:37, padding:"0 16px", border:"none", borderRadius:"var(--r-sm)", fontSize:"var(--fs-xs)", fontWeight:700, background:"var(--accent)", color:"var(--accent-ink)", cursor:"pointer", fontFamily:APP_SANS, boxShadow:"0 3px 14px hsl(var(--mood-h) 80% 45% / 0.34)", transition:"background 0.15s, box-shadow 0.15s", whiteSpace:"nowrap" }}><Icon name="plus" size={15} /> New {ENTITY_LABEL[tab.slice(0,-1)]}</button>
            <button onClick={() => setPaletteOpen(true)} title="Command palette (⌘K)" aria-label="Open command palette" className="kn-save-btn kn-press kn-hit" style={{ display:"inline-flex", alignItems:"center", gap:6, height:37, padding:"0 12px", border:"1px solid var(--border)", borderRadius:"var(--r-sm)", fontSize:"var(--fs-2xs)", fontWeight:600, color:"var(--text3)", background:"transparent", cursor:"pointer", fontFamily:APP_MONO, transition:"all 0.12s" }}><Icon name="search" size={14} /> ⌘K</button>
            <button onClick={() => setSettingsOpen(o => !o)} aria-label="Settings" className="kn-press kn-hit" style={{ width:37, height:37, flexShrink:0, borderRadius:"var(--r-sm)", border:`1px solid ${settingsOpen ? "var(--accent)" : "var(--border)"}`, background: settingsOpen ? "hsl(var(--mood-h) 80% 50% / 0.12)" : "transparent", color: settingsOpen ? "var(--accent-hover)" : "var(--text3)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}><Icon name="gear" size={17} /></button>
            <button onClick={() => setDark(d => !d)} aria-label={dark ? "Switch to light appearance" : "Switch to dark appearance"} title={dark ? "Light" : "Dark"} className="kn-press kn-hit" style={{ width:37, height:37, borderRadius:"50%", border:"1.5px solid var(--border)", background:"transparent", color:"var(--text3)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"border-color 0.18s", flexShrink:0 }}><Icon name={dark ? "moon" : "sun"} size={16} /></button>
          </div>
        </div>

        {/* NAV TABS + CONTROLS */}
        <div className={"kn-nav" + (tab === "tasks" ? "" : " kn-nav-empty")} style={{ height:42, borderBottom:"1px solid var(--border)", display:"flex", alignItems:"stretch", padding:"0 32px", flexShrink:0 }}>
          <div className="kn-tabs" style={{ display:"flex", height:"100%" }}>
            {TABS.map(({ key, label, count }) => (
              <button key={key} className="nav-tab" onClick={() => goto(key)} style={{ display:"flex", alignItems:"center", gap:6, padding:"0 15px", fontSize:"var(--fs-xs)", fontWeight:tab === key ? 700 : 500, color: tab === key ? "var(--text)" : "var(--text3)", background:"transparent", border:"none", borderBottom: tab === key ? "2px solid var(--accent)" : "2px solid transparent", cursor:"pointer", fontFamily:APP_SANS, letterSpacing:"-0.01em", transition:"color 0.15s", whiteSpace:"nowrap" }}>
                {label}
                {count !== "" && (
                  <span className="kn-num" style={{ fontSize:"var(--fs-overline)", color:"var(--text4)", background:"var(--surface2)", padding:"1px 6px", borderRadius:"var(--r-xs)", fontWeight:600 }}>{count}</span>
                )}
              </button>
            ))}
          </div>
          {tab === "tasks" && (
            <div className="kn-controls" style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8, animation:"slideDown 0.18s ease both" }}>
              <div className="kn-segment" style={{ display:"flex", alignItems:"center", gap:2, flexShrink:0, background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"var(--r-pill)", padding:3, height:33 }}>
                {[["all","All"],["overdue","Overdue"],["blocked","Blocked"]].map(([val,lbl]) => {
                  const on = filter === val;
                  return (
                    <button key={val} onClick={() => setFilter(val)} className="kn-press" style={{ height:"100%", padding:"0 14px", cursor:"pointer", border:"none", borderRadius:"var(--r-pill)", fontSize:"var(--fs-xs)", fontWeight:on ? 700 : 500, color: on ? "var(--text)" : "var(--text3)", background: on ? "var(--surface)" : "transparent", boxShadow: on ? "var(--sh-1)" : "none", fontFamily:APP_SANS, transition:"all 0.2s var(--ease-smooth)", whiteSpace:"nowrap" }}>{lbl}</button>
                  );
                })}
              </div>
              <div className="kn-searchwrap" style={{ display:"flex", alignItems:"center", height:33, border:"1px solid var(--border)", borderRadius:"var(--r-pill)", overflow:"hidden", background:"var(--surface2)", paddingLeft:11 }}>
                <Icon name="search" size={14} style={{ color:"var(--text4)" }} />
                <input id="kn-search" className="kn-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" style={{ border:"none", background:"transparent", color:"var(--text)", fontFamily:APP_SANS, fontSize:16, padding:"0 13px 0 8px", outline:"none", width:150, height:"100%" }} />
              </div>
            </div>
          )}
        </div>

        {/* MAIN CONTENT */}
        <div key={tab} style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", minHeight:0, background:"transparent", animation:"fadeSlide 0.26s var(--ease-out) both" }}>
          {tab === "tasks"     && <TasksView tasks={tasks} onStatusChange={onStatusChange} onDelete={onDeleteTask} onEdit={t => setModal({ kind:"task", item:t })} filter={filter} search={search} />}
          {tab === "projects"  && <ProjectsView projects={S.projects||[]} tasks={tasks} onEdit={p => setModal({ kind:"project", item:p })} onDelete={deleteProject} onAddTask={pid => setModal({ kind:"task", item:{ project:pid } })} />}
          {tab === "payments"  && <PaymentsView payments={S.payments||[]} onToggle={onTogglePayment} onEdit={p => setModal({ kind:"payment", item:p })} onDelete={deletePayment} />}
          {tab === "decisions" && <DecisionsView decisions={S.decisions||[]} onEdit={d => setModal({ kind:"decision", item:d })} onDelete={deleteDecision} />}
        </div>

        {/* FOOTER */}
        <div className="kn-footer" style={{ height:30, borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", padding:"0 32px", flexShrink:0, justifyContent:"space-between" }}>
          <div className="kn-footer-keys" style={{ display:"flex", gap:14, alignItems:"center" }}>
            <Kbd k="⌘K" label="commands" />
            <Kbd k="N" label="new" />
            <Kbd k="/" label="search" />
          </div>
          <span className="kn-num" style={{ fontSize:"var(--fs-2xs)", color:"var(--text4)" }}>{_lastSavedAt ? "Saved · " + new Date(_lastSavedAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : "Auto-sync on"}</span>
        </div>

        {/* MOBILE BOTTOM TAB BAR */}
        <div className="kn-bottom-nav">
          {TABS.map(({ key, label, count, icon }) => {
            const on = tab === key;
            return (
              <button key={key} onClick={() => goto(key)} className="kn-press"
                style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, padding:"5px 0", border:"none", background:"transparent", cursor:"pointer", color: on ? "var(--accent-hover)" : "var(--text3)", position:"relative", fontFamily:APP_SANS }}>
                <div style={{ position:"relative" }}>
                  <Icon name={icon} size={23} stroke={on ? 2.1 : 1.8} />
                  {count !== "" && count > 0 && (
                    <span className="kn-num" style={{ position:"absolute", top:-5, right:-9, minWidth:15, height:15, padding:"0 4px", borderRadius:"var(--r-pill)", background:on?"var(--accent)":"var(--text4)", color:"#fff", fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>{count}</span>
                  )}
                </div>
                <span className="kn-bottom-tab-label" style={{ fontSize:"var(--fs-2xs)", fontWeight: on ? 700 : 500, letterSpacing:"-0.01em" }}>{label}</span>
              </button>
            );
          })}
        </div>

        {/* FAB */}
        <button onClick={startNew} aria-label="New" className="kn-fab kn-press"
          style={{ width:56, height:56, borderRadius:"50%", border:"none", background:"var(--accent)", color:"#fff", alignItems:"center", justifyContent:"center", cursor:"pointer", boxShadow:"0 8px 24px hsl(var(--mood-h) 80% 45% / 0.5), 0 2px 8px rgba(0,0,0,0.3)" }}><Icon name="plus" size={26} stroke={2.2} /></button>

        {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} onAddRole={onAddRole} onRenameRole={onRenameRole} onToast={showToast} />}
        {modal && <EntityModal kind={modal.kind} item={modal.item} projects={S.projects||[]} onClose={() => setModal(null)} onSave={f => { saveEntity(modal.kind, f); setModal(null); }} onDelete={id => { deleteEntity(modal.kind, id); setModal(null); }} />}
        {paletteOpen && <CommandPalette actions={paletteActions} onClose={() => setPaletteOpen(false)} />}
        {dialog && dialog.type === "confirm" && <ConfirmDialog {...dialog.props} onResolve={resolveDialog} />}
        {dialog && dialog.type === "prompt" && <PromptDialog {...dialog.props} onResolve={resolveDialog} />}

        {toastMsg && (
          <div className="kn-toast" style={{ position:"fixed", bottom:44, right:20, background:"var(--glass-bg)", backdropFilter:"var(--glass)", WebkitBackdropFilter:"var(--glass)", border:"1px solid var(--border2)", borderRadius:"var(--r-pill)", padding:"10px 18px", fontSize:"var(--fs-sm)", fontWeight:600, color:"var(--text)", zIndex:400, boxShadow:"var(--sh-2)", animation:"sheetUp 0.28s var(--ease-spring) both", pointerEvents:"none" }}>{toastMsg}</div>
        )}
      </div>
    </React.Fragment>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})();
