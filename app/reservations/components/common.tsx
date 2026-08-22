import type { ReactNode } from "react";

export function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>, users: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></>,
    store: <><path d="M3 9l2-5h14l2 5"/><path d="M5 13v8h14v-8M9 21v-6h6v6"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    menu: <><path d="M4 3v8M7 3v8M4 7h3M5.5 11v10"/><path d="M15 3v18"/><path d="M15 3c3 1.5 5 4.5 5 8h-5"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>, bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    arrow: <path d="m9 18 6-6-6-6"/>, check: <path d="m5 12 4 4L19 6"/>, close: <path d="M18 6 6 18M6 6l12 12"/>, plus: <path d="M12 5v14M5 12h14"/>, search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export function Stat({ icon, label, value, note, color, onClick }: { icon: string; label: string; value: string; note: string; color: string; onClick?: () => void }) {
  return <button className={`stat ${onClick ? "clickable" : "static"}`} onClick={onClick} disabled={!onClick}><span className={`stat-icon ${color}`}><Icon name={icon}/></span><div><p>{label}</p><strong>{value}<small>件</small></strong>{note && <span className={color === "amber" || color === "violet" ? "attention" : "positive"}>{note}</span>}</div></button>;
}

export function InfoMetric({ icon, label, value, color }: { icon?: string; label: string; value: string; color: string }) {
  return <div className={`info-metric ${icon ? "" : "no-icon"}`}>{icon && <span className={`stat-icon ${color}`}><Icon name={icon}/></span>}<div><p>{label}</p><strong>{value}<small>件</small></strong></div></div>;
}

export function Task({ color, title, count, text, onClick }: { color: string; title: string; count?: number; text: string; onClick?: () => void }) {
  return <button className={`task ${count ? "has-count" : "no-count"}`} onClick={onClick}><i className={color}/><div><strong>{title}{count !== undefined && <span className="task-count">{count}件</span>}</strong><small>{text}</small></div><Icon name="arrow"/></button>;
}
