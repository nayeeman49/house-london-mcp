"use client";

import { usePathname } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

/** Re-triggers enter animation on route change */
export function PageMotion({ children }: Props) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="page-motion">
      {children}
    </div>
  );
}
