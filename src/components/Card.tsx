import Link from "next/link";
import type { ReactNode } from "react";

type CardProps = {
  href?: string;
  children: ReactNode;
  className?: string;
};

export function Card({ href, children, className = "" }: CardProps) {
  const base =
    "block rounded-xl border border-gray-200 bg-white shadow-sm p-4";
  const interactive =
    "transition-all hover:border-teal-300 hover:shadow-md";
  const classes = href
    ? `${base} ${interactive} ${className}`
    : `${base} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return <div className={classes}>{children}</div>;
}
