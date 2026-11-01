import { NavLink } from "react-router";
import { IconCalendar, IconSearch, IconShelf, IconUser } from "./Icons";

const ITEMS = [
  { to: "/", label: "Estante", Icon: IconShelf },
  { to: "/buscar", label: "Buscar", Icon: IconSearch },
  { to: "/anos", label: "Por ano", Icon: IconCalendar },
  { to: "/perfil", label: "Perfil", Icon: IconUser },
];

export function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95" aria-label="Navegação principal">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5">
        {ITEMS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition ${isActive ? "text-accent-600 dark:text-accent-400" : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"}`
              }
            >
              <Icon width={24} height={24} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
