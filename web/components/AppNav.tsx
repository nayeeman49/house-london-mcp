"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/problems", label: "Problems" },
  { href: "/map", label: "Map" },
  { href: "/chat", label: "Ask" },
  { href: "/desk", label: "Desk" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="app-nav relative z-10">
      <Link href="/" className="app-nav-brand">
        HouseData Engine
      </Link>
      <div className="app-nav-links">
        {LINKS.map(({ href, label }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`app-nav-link ${active ? "app-nav-link-active" : ""}`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
