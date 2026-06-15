/* ════════════════════════════════════════════════════════════════
   HELPERS — constants · unified icon set · interaction primitives
   Registers everything on window.KN for the other UI modules.
   ════════════════════════════════════════════════════════════════ */
(function () {
const { Fragment } = React;

const SANS = "var(--font-sans)";
const MONO = "var(--font-mono)";

const DEFAULT_ROLE_COLORS = { CEO:"#0a6cff", COO:"#4a8bc8", CFO:"#12a150", CMO:"#a855f7", CIO:"#ef7c12" };
const FALLBACK_PALETTE = ["#0a6cff","#4a8bc8","#12a150","#a855f7","#ef7c12","#f97316","#06b6d4","#ec4899"];

/* Status: every color flows through appearance-aware tokens so it adapts
   correctly across light / dark instead of being baked to one appearance. */
const STATUS = {
  "in-progress": { label:"In Progress", color:"var(--st-progress)", bar:"var(--st-progress)", bg:"var(--st-progress-bg)", border:"var(--st-progress-bd)" },
  "blocked":     { label:"Blocked",     color:"var(--st-blocked)",  bar:"var(--st-blocked)",  bg:"var(--st-blocked-bg)",  border:"var(--st-blocked-bd)"  },
  "pending":     { label:"Pending",     color:"var(--st-pending)",  bar:"var(--st-pending)",  bg:"var(--st-pending-bg)",  border:"var(--st-pending-bd)"  },
  "done":        { label:"Done",        color:"var(--st-done)",     bar:"var(--st-done)",     bg:"var(--st-done-bg)",     border:"var(--st-done-bd)"     },
};
const STATUS_CYCLE = ["pending","in-progress","blocked","done"];

function roleColor(role) {
  if (S.roleColors && S.roleColors[role]) return S.roleColors[role];
  if (DEFAULT_ROLE_COLORS[role]) return DEFAULT_ROLE_COLORS[role];
  let h = 0; for (let i=0;i<role.length;i++) h = (h*31 + role.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[h % FALLBACK_PALETTE.length];
}
function projectName(id) {
  const all = [...(S.projects||[]), ...(S.archivedProjects||[])];
  const p = all.find(x => x.id === id);
  return p ? p.name : (id || "—");
}
function urgencyOf(t) { return isOverdue(t) ? "overdue" : isDueSoon(t) ? "soon" : "normal"; }
function fmtMoneyShort(n) {
  n = Number(n) || 0;
  if (Math.abs(n) >= 1000) { const k = n/1000; return "$" + (k % 1 === 0 ? k : k.toFixed(1)) + "k"; }
  return "$" + n.toLocaleString();
}
function fmtMoney(n) { return "$" + (Number(n)||0).toLocaleString(); }

/* ── Unified SVG icon set (replaces every ✎ ✕ ⚙ ✓ ▾ → glyph) ──
   One family · one stroke language · optically aligned. */
const ICONS = {
  close:     <path d="M6 6l12 12M18 6L6 18" />,
  edit:      <Fragment><path d="M4 20h4L18.6 9.4a2.1 2.1 0 0 0-3-3L5 17z" /><path d="M14 6.5l3 3" /></Fragment>,
  trash:     <Fragment><path d="M5 7h14" /><path d="M9 7V5h6v2" /><path d="M7.5 7l.9 12h7.2l.9-12" /></Fragment>,
  gear:      <Fragment><circle cx="12" cy="12" r="3" /><path d="M19.4 13a7.8 7.8 0 0 0 0-2l1.9-1.5-1.9-3.3-2.3 1a7.6 7.6 0 0 0-1.7-1L14.9 3h-3.8l-.5 2.2a7.6 7.6 0 0 0-1.7 1l-2.3-1L4.7 8.5 6.6 10a7.8 7.8 0 0 0 0 2l-1.9 1.5 1.9 3.3 2.3-1a7.6 7.6 0 0 0 1.7 1l.5 2.2h3.8l.5-2.2a7.6 7.6 0 0 0 1.7-1l2.3 1 1.9-3.3z" /></Fragment>,
  check:     <path className="kn-check-path" d="M5 12.5l4.2 4.2L19 7" />,
  chevron:   <path d="M5 8.5l7 7 7-7" />,
  arrow:     <Fragment><path d="M5 12h13" /><path d="M13 6.5l5.5 5.5-5.5 5.5" /></Fragment>,
  plus:      <path d="M12 5v14M5 12h14" />,
  search:    <Fragment><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Fragment>,
  spark:     <path d="M12 3l1.7 4.8L18.5 9.5 13.7 11.2 12 16l-1.7-4.8L5.5 9.5l4.8-1.7z" />,
  sun:       <Fragment><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></Fragment>,
  moon:      <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" />,
  tasks:     <Fragment><path d="M4 6.5h11M4 12h11M4 17.5h7" /><path d="M18 5.5l1.6 1.6L22.5 4M18 11l1.6 1.6L22.5 9.5" /></Fragment>,
  projects:  <path d="M3 7.5a2 2 0 0 1 2-2h3.4a2 2 0 0 1 1.6.8l.9 1.2H19a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  payments:  <Fragment><path d="M3 7.5h18a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" /><path d="M2.5 11h19M6 14.5h3" /></Fragment>,
  decisions: <path d="M12 4l2.3 4.7 5.2.8-3.75 3.66.9 5.16L12 16.9l-4.65 2.42.9-5.16L4.5 9.5l5.2-.8z" />,
};

const Icon = ({ name, size=16, stroke=1.8, fill=false, style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"}
    stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
    style={{ display:"block", flexShrink:0, ...style }} aria-hidden="true" focusable="false" {...rest}>
    {ICONS[name] || null}
  </svg>
);

/* ── Static surface (was magnetic tilt — disabled for performance) ── */
const Tilt = ({ max, lift, className="", style, children, ...rest }) => (
  <div className={"kn-tilt " + className} style={style} {...rest}>{children}</div>
);

/* ── Static number (was odometer — renders value directly) ── */
const AnimatedNumber = ({ value, style, className }) => (
  <span className={className} style={style}>{value}</span>
);

Object.assign(window.KN, {
  SANS, MONO, DEFAULT_ROLE_COLORS, FALLBACK_PALETTE, STATUS, STATUS_CYCLE,
  roleColor, projectName, urgencyOf, fmtMoneyShort, fmtMoney,
  Icon, ICONS, Tilt, AnimatedNumber,
});
})();
