import React from "react";

export default function AuthLayout({
  icon: Icon,
  title,
  subtitle,
  footer,
  children,
}) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
              <Icon
                className="w-7 h-7 text-primary-foreground"
                aria-hidden="true"
              />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="text-muted-foreground mt-2">{subtitle}</p>
            )}
          </div>
          <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
            {children}
          </div>
          {footer && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              {footer}
            </p>
          )}
        </div>
      </div>
      <footer className="shrink-0 py-5 px-4 lg:px-8 text-center text-md font-medium text-muted-foreground no-print">
        <span className="inline-block border-t border-border pt-3">
          © {currentYear} Powered by Powersoft360. All rights reserved.
        </span>
      </footer>
    </div>
  );
}
