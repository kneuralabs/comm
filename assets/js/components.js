/* ════════════════════════════════════════════════════════════════
   COMPONENTS — micro-components · views · dialogs · command palette
   Consumes primitives from window.KN, registers views back onto it.
   ════════════════════════════════════════════════════════════════ */
(function () {
const { useState, useEffect, useRef, useMemo, Fragment } = React;
const {
  Icon, Tilt, AnimatedNumber, STATUS, STATUS_CYCLE, MONO, SANS,
  roleColor, projectName, urgencyOf, fmtMoney, fmtMoneyShort,
} = window.KN;

/* ── Micro-components ── */
const StatusBadge = ({ status, onClick }) => {
  const s = STATUS[status] || STATUS.pending;
  return (
    <span onClick={onClick} className={onClick ? "kn-status-badge kn-press" : "kn-status-badge"} style={{
      display:"inline-flex", alignItems:"center", gap:6,
      fontSize:"var(--fs-2xs)", fontWeight:600, padding:"4px 10px", borderRadius:"var(--r-pill)",
      border:`1px solid ${s.border}`, background:s.bg, color:s.color,
      cursor:onClick?"pointer":"default", userSelect:"none",
      transition:"opacity 0.12s, transform 0.12s", whiteSpace:"nowrap", letterSpacing:"0.01em",
    }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.color, flexShrink:0,
        animation: status==="blocked" ? "pulseOpacity 2s ease infinite" : "none" }} />
      {s.label}
    </span>
  );
};

const RoleDot = ({ role }) => (
  <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
    <div style={{ width:6, height:6, borderRadius:"50%", background:roleColor(role), flexShrink:0 }} />
    <span style={{ fontSize:"var(--fs-xs)", color:"var(--text3)", fontWeight:500 }}>{role}</span>
  </div>
);

const Kbd = ({ k, label }) => (
  <span style={{ fontSize:"var(--fs-2xs)", color:"var(--text4)", display:"flex", gap:4, alignItems:"center" }}>
    <span style={{ fontFamily:MONO, fontSize:"var(--fs-overline)", padding:"1px 5px", border:"1px solid var(--border)", borderRadius:5, color:"var(--text3)", background:"var(--surface2)" }}>{k}</span>
    {label}
  </span>
);

const IconBtn = ({ icon, title, danger, onClick }) => (
  <button onClick={(e) => { e.stopPropagation(); onClick(); }} title={title} aria-label={title}
    className="btn-ghost kn-press kn-hit" style={{ width:34, height:34, flexShrink:0, borderRadius:"var(--r-xs)",
    border:"1px solid var(--border)", background:"transparent", color:danger?"var(--red)":"var(--text3)",
    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.14s" }}>
    <Icon name={icon} size={15} />
  </button>
);

const MLBL = { fontSize:"var(--fs-overline)", fontWeight:700, letterSpacing:"var(--tracking-label)", textTransform:"uppercase", color:"var(--text4)", display:"block", marginBottom:6 };
const Field = ({ label, children }) => (<div><label style={MLBL}>{label}</label>{children}</div>);

/* Custom checkbox — draws its checkmark on completion */
const CheckBox = ({ done, onClick, size=18 }) => (
  <div onClick={onClick} role="checkbox" aria-checked={done} tabIndex={0}
    onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onClick(e); } }}
    className={"kn-check kn-press" + (done ? " is-done" : "")}
    style={{ width:size, height:size, border:`1.6px solid ${done ? "var(--st-done)" : "var(--border2)"}`,
      borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center",
      background: done ? "var(--st-done-bg)" : "transparent", color:"var(--st-done)",
      flexShrink:0, cursor:"pointer", margin:"0 11px 0 12px" }}>
    <svg width={size-6} height={size-6} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity:done?1:0, transition:"opacity 0.18s" }}>
      <path className="kn-check-path" d="M5 12.5l4.2 4.2L19 7" />
    </svg>
  </div>
);

/* ── Task row (expandable) ── */
const TaskRow = ({ task, onStatusChange, onDelete, onEdit }) => {
  const [open, setOpen] = useState(false);
  const s = STATUS[task.status] || STATUS.pending;
  const isDone = task.status === "done";
  const urg = urgencyOf(task);
  const dueCol = urg==="overdue" ? "var(--red)" : urg==="soon" ? "var(--orange)" : "var(--text4)";
  const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(task.status)+1) % STATUS_CYCLE.length];
  const cycleStatus = (e) => { e.stopPropagation(); onStatusChange(task.id, nextStatus); };

  return (
    <div className="kn-task-card">
      <div onClick={() => setOpen(x => !x)} className="kn-task-row" style={{
        display:"flex", alignItems:"center", height:46, paddingRight:14,
        borderLeft:`4px solid ${s.bar}`,
        background: open ? `linear-gradient(90deg,${s.bg} 0%,var(--surface) 220px)` : "transparent",
        borderBottom: open ? "none" : "1px solid var(--line)", cursor:"pointer", transition:"background 0.2s",
      }}>
        <CheckBox done={isDone} onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, isDone ? "pending" : "done"); }} />
        <div className="kn-task-main" style={{ flex:1, minWidth:0, paddingRight:14 }}>
          <div style={{ fontSize:"var(--fs-sm)", fontWeight:isDone ? 400 : 500, color:isDone ? "var(--text4)" : "var(--text)", textDecoration:isDone ? "line-through" : "none", letterSpacing:"-0.01em", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{task.title}</div>
          {/* Mobile-only: surface the same Role · Project · Due data shown in the desktop columns */}
          <div className="kn-task-submeta" style={{ display:"none", alignItems:"center", gap:8, marginTop:5, whiteSpace:"nowrap", overflow:"hidden" }}>
            <RoleDot role={task.role} />
            <span style={{ width:3, height:3, borderRadius:"50%", background:"var(--text4)", flexShrink:0 }} />
            <span style={{ fontSize:"var(--fs-xs)", color:"var(--text4)", overflow:"hidden", textOverflow:"ellipsis", minWidth:0, flex:"0 1 auto" }}>{projectName(task.project)}</span>
            {task.due ? (
              <Fragment>
                <span style={{ width:3, height:3, borderRadius:"50%", background:"var(--text4)", flexShrink:0 }} />
                <span className="kn-num" style={{ fontSize:"var(--fs-2xs)", color:dueCol, fontWeight:500, flexShrink:0 }}>{dispDate(task.due)}</span>
              </Fragment>
            ) : null}
          </div>
        </div>
        <div className="kn-col-status" style={{ width:124 }}><StatusBadge status={task.status} onClick={cycleStatus} /></div>
        <div className="kn-col-role" style={{ width:70 }}><RoleDot role={task.role} /></div>
        <div className="kn-col-project" style={{ width:126, fontSize:"var(--fs-xs)", color:"var(--text4)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{projectName(task.project)}</div>
        <div className="kn-col-due kn-num" style={{ width:56, fontSize:"var(--fs-2xs)", color:dueCol, textAlign:"right", fontWeight:500 }}>{dispDate(task.due)}</div>
        <div style={{ width:22, display:"flex", justifyContent:"center", color:"var(--text4)", transition:"transform 0.24s var(--ease-smooth)", transform:open?"rotate(180deg)":"rotate(0deg)", flexShrink:0 }}><Icon name="chevron" size={14} /></div>
      </div>
      {open && (
        <div style={{ borderLeft:`4px solid ${s.bar}`, borderBottom:"1px solid var(--line)", background:`linear-gradient(90deg,${s.bg} 0%,var(--surface) 240px)`, padding:"10px 14px 14px 42px", animation:"fadeSlide 0.2s var(--ease-out) both" }}>
          <div className="kn-row-meta" style={{ alignItems:"center", gap:14, marginBottom:9, flexWrap:"wrap" }}>
            <RoleDot role={task.role} />
            <span style={{ fontSize:"var(--fs-xs)", color:"var(--text3)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"60%" }}>{projectName(task.project)}</span>
            {task.due ? <span className="kn-num" style={{ fontSize:"var(--fs-2xs)", color:dueCol, fontWeight:500 }}>{dispDate(task.due)}</span> : null}
          </div>
          {task.nextAction ? (
            <div style={{ display:"flex", gap:8, marginBottom:6, alignItems:"flex-start" }}>
              <span style={{ fontSize:"var(--fs-overline)", fontWeight:700, letterSpacing:"var(--tracking-label)", textTransform:"uppercase", color:"var(--accent-hover)", flexShrink:0, marginTop:2 }}>NEXT</span>
              <span style={{ fontSize:"var(--fs-xs)", color:"var(--text2)", lineHeight:1.5 }}>{task.nextAction}</span>
            </div>
          ) : null}
          {task.notes ? (
            <div style={{ display:"flex", gap:8, marginBottom:6, alignItems:"flex-start" }}>
              <span style={{ fontSize:"var(--fs-overline)", fontWeight:700, letterSpacing:"var(--tracking-label)", textTransform:"uppercase", color:"var(--text4)", flexShrink:0, marginTop:2 }}>NOTES</span>
              <span style={{ fontSize:"var(--fs-xs)", color:"var(--text3)", lineHeight:1.5 }}>{task.notes}</span>
            </div>
          ) : null}
          {!task.nextAction && !task.notes && (
            <div style={{ fontSize:"var(--fs-xs)", color:"var(--text4)", fontStyle:"italic", marginBottom:6 }}>No next action recorded.</div>
          )}
          <div style={{ display:"flex", gap:6, marginTop:10 }}>
            <button onClick={cycleStatus} className="kn-press" style={{ display:"inline-flex", alignItems:"center", gap:5, height:30, padding:"0 11px", border:`1px solid ${STATUS[nextStatus]?.border||"var(--border)"}`, borderRadius:"var(--r-xs)", fontSize:"var(--fs-2xs)", fontWeight:600, color:STATUS[nextStatus]?.color||"var(--text3)", background:STATUS[nextStatus]?.bg||"var(--surface2)", cursor:"pointer", fontFamily:SANS }}><Icon name="arrow" size={13} /> {STATUS[nextStatus]?.label}</button>
            <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="kn-press" style={{ display:"inline-flex", alignItems:"center", gap:5, height:30, padding:"0 11px", border:"1px solid var(--border)", borderRadius:"var(--r-xs)", fontSize:"var(--fs-2xs)", fontWeight:600, color:"var(--text3)", background:"transparent", cursor:"pointer", fontFamily:SANS }}><Icon name="edit" size={13} /> Edit</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="kn-press" style={{ display:"inline-flex", alignItems:"center", gap:5, height:30, padding:"0 11px", border:"1px solid var(--st-blocked-bd)", borderRadius:"var(--r-xs)", fontSize:"var(--fs-2xs)", fontWeight:600, color:"var(--red)", background:"rgba(225,29,46,0.06)", cursor:"pointer", fontFamily:SANS }}><Icon name="trash" size={13} /> Delete</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Tasks view (grouped, collapsible) ── */
const TasksView = ({ tasks, onStatusChange, onDelete, onEdit, filter, search }) => {
  const [collapsed, setCollapsed] = useState({ done:true });
  const toggle = k => setCollapsed(c => ({ ...c, [k]:!c[k] }));

  const vis = tasks.filter(t => {
    if (filter === "overdue" && urgencyOf(t) !== "overdue") return false;
    if (filter === "blocked" && t.status !== "blocked") return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(t.title||"").toLowerCase().includes(q) && !projectName(t.project).toLowerCase().includes(q) && !(t.role||"").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const groups = [
    { key:"in-progress", label:"In Progress", accent:"var(--st-progress)" },
    { key:"blocked",     label:"Blocked",     accent:"var(--st-blocked)" },
    { key:"pending",     label:"Pending",     accent:"var(--st-pending)" },
    { key:"done",        label:"Done",        accent:"var(--st-done)" },
  ];

  const HEAD = { fontSize:"var(--fs-overline)", fontWeight:700, letterSpacing:"var(--tracking-label)", textTransform:"uppercase", color:"var(--text4)" };
  return (
    <div className="kn-tasks-scroll" style={{ flex:1, overflow:"auto", minHeight:0 }}>
      <div className="kn-tasks-thead" style={{ height:30, display:"flex", alignItems:"center", paddingLeft:5, paddingRight:14, background:"var(--surface2)", borderBottom:"1px solid var(--border)", position:"sticky", top:0, zIndex:10, flexShrink:0 }}>
        <div style={{ width:44 }} />
        <div style={{ flex:1, ...HEAD }}>Task</div>
        <div style={{ width:124, ...HEAD }}>Status</div>
        <div className="kn-col-role" style={{ width:70, ...HEAD }}>Role</div>
        <div className="kn-col-project" style={{ width:126, ...HEAD }}>Project</div>
        <div style={{ width:56, ...HEAD, textAlign:"right" }}>Due</div>
        <div style={{ width:22 }} />
      </div>
      {tasks.length === 0 && <EmptyState icon="tasks" title="No tasks yet" hint="Create a project, then add your first task. Press N or ⌘K to begin." />}
      {groups.map(g => {
        const total = tasks.filter(t => t.status === g.key).length;
        const rows = vis.filter(t => t.status === g.key);
        if (!total) return null;
        return (
          <Fragment key={g.key}>
            <div onClick={() => toggle(g.key)} style={{ height:34, display:"flex", alignItems:"center", padding:"0 14px 0 12px", background:"var(--surface2)", borderTop:"1px solid var(--border)", borderBottom:"1px solid var(--border)", gap:9, cursor:"pointer", userSelect:"none", whiteSpace:"nowrap", overflow:"hidden" }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:g.accent, flexShrink:0, animation:g.key==="blocked" ? "pulseOpacity 2s ease infinite" : "none" }} />
              <span style={{ fontSize:"var(--fs-2xs)", fontWeight:700, letterSpacing:"0.11em", textTransform:"uppercase", color:g.accent }}>{g.label}</span>
              <span className="kn-num" style={{ fontSize:"var(--fs-2xs)", color:"var(--text3)", fontWeight:500 }}>{total}</span>
              {vis.length !== tasks.length && rows.length > 0 && <span style={{ fontSize:"var(--fs-overline)", color:"var(--text4)" }}>({rows.length} shown)</span>}
              <div style={{ marginLeft:"auto", color:"var(--text4)", display:"flex", transition:"transform 0.24s var(--ease-smooth)", transform:collapsed[g.key] ? "rotate(-90deg)" : "rotate(0deg)" }}><Icon name="chevron" size={14} /></div>
            </div>
            {!collapsed[g.key] && rows.length === 0 && (
              <div style={{ padding:"12px 20px", fontSize:"var(--fs-xs)", color:"var(--text4)", borderBottom:"1px solid var(--line)" }}>No matching tasks in this group</div>
            )}
            {!collapsed[g.key] && rows.map(t => (
              <TaskRow key={t.id} task={t} onStatusChange={onStatusChange} onDelete={onDelete} onEdit={onEdit} />
            ))}
          </Fragment>
        );
      })}
      {tasks.length > 0 && vis.length === 0 && (
        <div style={{ padding:"48px 20px", textAlign:"center", color:"var(--text4)", fontSize:"var(--fs-sm)" }}>No tasks match — try clearing the filter</div>
      )}
    </div>
  );
};

/* ── Crafted empty state ── */
const EmptyState = ({ icon, title, hint }) => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"64px 24px", gap:14, animation:"fadeSlide 0.4s var(--ease-out) both" }}>
    <div className="kn-moodglow" style={{ width:64, height:64, borderRadius:"var(--r-lg)", display:"flex", alignItems:"center", justifyContent:"center", color:"hsl(var(--mood-h) 70% 55%)", background:"hsl(var(--mood-h) 70% 55% / 0.08)", border:"1px solid hsl(var(--mood-h) 70% 55% / 0.20)" }}>
      <Icon name={icon} size={28} stroke={1.6} />
    </div>
    <div style={{ fontSize:"var(--fs-lg)", fontWeight:700, color:"var(--text)", letterSpacing:"-0.02em" }}>{title}</div>
    <div style={{ fontSize:"var(--fs-sm)", color:"var(--text3)", maxWidth:320, lineHeight:1.5 }}>{hint}</div>
  </div>
);

/* ── Projects view ── */
const ProjectsView = ({ projects, tasks, onEdit, onDelete, onAddTask }) => (
  <div className="kn-content-pad" style={{ flex:1, overflow:"auto", padding:"24px 32px" }}>
    {projects.length === 0 && <EmptyState icon="projects" title="No projects yet" hint="Projects group your work. Create one to start tracking tasks, owners and deadlines." />}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:16 }}>
      {projects.map((p, i) => {
        const pt = tasks.filter(t => t.project === p.id);
        const total = pt.length;
        const done = pt.filter(t => t.status === "done").length;
        const blocked = pt.filter(t => t.status === "blocked").length;
        const progress = total ? Math.round(done/total*100) : 0;
        const upcoming = pt.filter(t => t.due && t.status !== "done").sort((a,b)=>a.due.localeCompare(b.due))[0];
        const due = upcoming ? dispDate(upcoming.due) : "—";
        const barColor = blocked > 0 ? "var(--orange)" : progress > 70 ? "var(--green)" : "var(--accent)";
        return (
          <Tilt key={p.id} style={{ background:`linear-gradient(135deg,color-mix(in srgb, ${barColor} 7%, var(--surface)) 0%,var(--surface) 60%)`, border:"1px solid var(--border)", borderLeft:`4px solid ${barColor}`, borderRadius:"var(--r-lg)", padding:"18px 20px", boxShadow:"var(--sh-1)", position:"relative", animation:`fadeSlide 0.4s var(--ease-out) ${Math.min(i,9)*0.04}s both` }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, marginBottom:6 }}>
              <div style={{ fontSize:"var(--fs-base)", fontWeight:700, color:"var(--text)", lineHeight:1.35, flex:1, minWidth:0, letterSpacing:"-0.01em" }}>{p.name}</div>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                {blocked > 0 && (
                  <span style={{ fontSize:"var(--fs-overline)", fontWeight:700, padding:"2px 6px", borderRadius:"var(--r-xs)", background:"var(--st-blocked-bg)", color:"var(--orange)", border:"1px solid var(--st-blocked-bd)", whiteSpace:"nowrap" }}>{blocked} blocked</span>
                )}
                <IconBtn icon="edit" title="Edit project" onClick={() => onEdit(p)} />
                <IconBtn icon="trash" title="Delete project" danger onClick={() => onDelete(p.id)} />
              </div>
            </div>
            <div style={{ fontSize:"var(--fs-2xs)", color:"var(--text4)", marginBottom:10 }}>{p.role || p.desc || "—"}</div>
            <div style={{ height:4, background:"var(--surface3)", borderRadius:3, marginBottom:9, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${progress}%`, background:barColor, borderRadius:3, transition:"width 0.9s var(--ease-out)" }} />
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span className="kn-num" style={{ fontSize:"var(--fs-xs)", color:"var(--text3)" }}>
                {done}<span style={{ color:"var(--text4)" }}>/{total}</span>
                <span style={{ color:"var(--text4)", fontFamily:SANS, fontSize:"var(--fs-2xs)", marginLeft:5 }}>tasks</span>
              </span>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <span className="kn-num" style={{ fontSize:"var(--fs-xs)", fontWeight:700, color:barColor }}>{progress}%</span>
                <span className="kn-num" style={{ fontSize:"var(--fs-2xs)", color:"var(--text4)" }}>{due}</span>
              </div>
            </div>
            <button onClick={() => onAddTask(p.id)} className="btn-ghost kn-press" style={{ marginTop:12, width:"100%", height:32, border:"1px dashed var(--border2)", borderRadius:"var(--r-sm)", background:"transparent", color:"var(--text3)", fontSize:"var(--fs-2xs)", fontWeight:600, cursor:"pointer", fontFamily:SANS, display:"inline-flex", alignItems:"center", justifyContent:"center", gap:5, transition:"all 0.14s" }}><Icon name="plus" size={13} /> Add task</button>
          </Tilt>
        );
      })}
    </div>
  </div>
);

/* ── Payments view ── */
const PaymentsView = ({ payments, onToggle, onEdit, onDelete }) => {
  const statusOf = (p) => p.status === "received" ? "received" : (p.due && daysUntil(p.due) < 0 ? "overdue" : "pending");
  const sum = (pred) => payments.filter(pred).reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const outstanding = sum(p => statusOf(p) !== "received");
  const received = sum(p => statusOf(p) === "received");
  const overdue = sum(p => statusOf(p) === "overdue");
  return (
    <div className="kn-content-pad" style={{ flex:1, overflow:"auto", padding:"24px 32px" }}>
      <div className="kn-pay-tiles" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:22 }}>
        {[
          { label:"Outstanding", value:outstanding, color:"var(--accent-hover)", bar:"var(--accent)" },
          { label:"Received",    value:received,    color:"var(--green)",        bar:"var(--green)" },
          { label:"Overdue",     value:overdue,     color:"var(--red)",          bar:"var(--red)" },
        ].map(tile => (
          <Tilt key={tile.label} max={5} style={{ padding:"15px 18px", background:`linear-gradient(135deg,color-mix(in srgb, ${tile.bar} 8%, var(--surface)) 0%,var(--surface) 64%)`, border:"1px solid var(--border)", borderLeft:`4px solid ${tile.bar}`, borderRadius:"var(--r-md)", boxShadow:"var(--sh-1)" }}>
            <div style={{ fontSize:"var(--fs-overline)", fontWeight:700, letterSpacing:"var(--tracking-label)", textTransform:"uppercase", color:"var(--text4)", marginBottom:7 }}>{tile.label}</div>
            <div className="kn-pay-val kn-num" style={{ fontSize:"var(--fs-2xl)", fontWeight:800, color:tile.color, letterSpacing:"-0.03em" }}>{fmtMoney(tile.value)}</div>
          </Tilt>
        ))}
      </div>
      {payments.length === 0 && <EmptyState icon="payments" title="No payments yet" hint="Track what's owed, what's landed, and what's overdue. Add a payment to begin." />}
      {payments.map((p, i) => {
        const st = statusOf(p);
        const sc = st === "received" ? "var(--green)" : st === "overdue" ? "var(--red)" : "var(--orange)";
        const scBg = st === "received" ? "var(--st-done-bg)" : st === "overdue" ? "rgba(225,29,46,0.10)" : "var(--st-blocked-bg)";
        return (
          <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 17px", marginBottom:8, background:"var(--surface)", border:"1px solid var(--border)", borderLeft:`4px solid ${sc}`, borderRadius:"var(--r-md)", boxShadow:"var(--sh-1)", animation:`fadeSlide 0.32s var(--ease-out) ${Math.min(i,9)*0.03}s both` }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:"var(--fs-sm)", fontWeight:600, color:"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.client || "—"}</div>
              {p.notes ? <div style={{ fontSize:"var(--fs-2xs)", color:"var(--text4)", marginTop:2 }}>{p.notes}</div> : null}
            </div>
            <div className="kn-num" style={{ fontSize:"var(--fs-lg)", fontWeight:800, color:"var(--text)", flexShrink:0 }}>{fmtMoney(p.amount)}</div>
            <div className="kn-num" style={{ fontSize:"var(--fs-2xs)", color:"var(--text4)", width:52, textAlign:"right", flexShrink:0 }}>{dispDate(p.due)}</div>
            <button onClick={() => onToggle(p.id)} className="kn-press" style={{ display:"inline-flex", alignItems:"center", gap:5, height:32, padding:"0 13px", border:"none", borderRadius:"var(--r-pill)", fontSize:"var(--fs-2xs)", fontWeight:700, cursor:"pointer", fontFamily:SANS, flexShrink:0, background:scBg, color:sc }}>
              {st === "received" ? <Fragment><Icon name="check" size={13} /> Received</Fragment> : st === "overdue" ? "Overdue" : "Pending"}
            </button>
            <IconBtn icon="edit" title="Edit payment" onClick={() => onEdit(p)} />
            <IconBtn icon="trash" title="Delete payment" danger onClick={() => onDelete(p.id)} />
          </div>
        );
      })}
    </div>
  );
};

/* ── Decisions view ── */
const DecisionsView = ({ decisions, onEdit, onDelete }) => (
  <div className="kn-content-pad" style={{ flex:1, overflow:"auto", padding:"24px 32px" }}>
    <div style={{ maxWidth:820 }}>
      {decisions.length === 0 && <EmptyState icon="decisions" title="No decisions logged" hint="Capture the calls that matter — what was decided and when — so the trail is never lost." />}
      {decisions.map((d, i) => {
        const parsed = new Date(d.ts);
        const valid = d.ts && !isNaN(parsed);
        const dateStr = valid ? parsed.toLocaleDateString('en-US',{month:'short',day:'numeric'}) : (d.ts || "");
        const timeStr = valid ? parsed.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false}) : "";
        return (
          <div key={d.id || i} style={{ display:"flex", gap:16, padding:"15px 0", borderBottom:"1px solid var(--line)", animation:`fadeSlide 0.28s var(--ease-out) ${i * 0.04}s both` }}>
            <div style={{ width:82, flexShrink:0, paddingTop:2 }}>
              <div className="kn-num" style={{ fontSize:"var(--fs-2xs)", color:"var(--text3)", lineHeight:1.4, fontWeight:500 }}>{dateStr}</div>
              {timeStr && <div className="kn-num" style={{ fontSize:"var(--fs-overline)", color:"var(--text4)", marginTop:1 }}>{timeStr}</div>}
            </div>
            <div style={{ width:2, background:"hsl(var(--mood-h) 60% 55% / 0.35)", borderRadius:2, flexShrink:0, alignSelf:"stretch", minHeight:20 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:"var(--fs-md)", color:"var(--text)", lineHeight:1.7, letterSpacing:"-0.005em" }}>{d.note || d.text || ""}</div>
            </div>
            <div style={{ display:"flex", gap:6, flexShrink:0, alignItems:"flex-start", paddingTop:1 }}>
              <IconBtn icon="edit" title="Edit decision" onClick={() => onEdit(d)} />
              <IconBtn icon="trash" title="Delete decision" danger onClick={() => onDelete(d.id)} />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

Object.assign(window.KN, {
  StatusBadge, RoleDot, Kbd, IconBtn, MLBL, Field, CheckBox,
  TaskRow, TasksView, EmptyState, ProjectsView, PaymentsView, DecisionsView,
});
})();
