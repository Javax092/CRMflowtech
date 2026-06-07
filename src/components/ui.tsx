import { clsx } from "clsx";
import Link from "next/link";

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { children: React.ReactNode }) {
  return <section className={clsx("rounded-lg border border-slate-200 bg-white shadow-sm", className)} {...props}>{children}</section>;
}

export function PageHeader({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Button({
  children,
  href,
  variant = "primary",
  type = "button",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const classes = clsx(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition",
    variant === "primary" && "bg-teal-700 text-white hover:bg-teal-800",
    variant === "secondary" && "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
    variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
    variant === "ghost" && "text-slate-700 hover:bg-slate-100",
    className
  );

  if (href) return <Link className={classes} href={href}>{children}</Link>;
  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  required
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      <span>
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "focus-ring min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400";

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", className)}>{children}</span>;
}
