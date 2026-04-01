import React from "react";
import { Link } from "react-router-dom";

const footerLinks = [
  {
    title: "Platform",
    links: [
      { label: "Discover", to: "/discover" },
      { label: "Pricing", to: "/pricing" },
      { label: "Premium Vault", to: "/vault" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Subscribe", to: "/pricing" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border/30 bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png" alt="Upper Vibe Media" className="w-8 h-8 object-contain" />
              <span className="font-heading font-bold tracking-[0.15em] text-sm">UPPER VIBE</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              More than music — a frequency. Elevate your listening experience.
            </p>
          </div>

          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="font-heading font-semibold text-xs tracking-[0.15em] uppercase text-foreground mb-4">
                {group.title}
              </h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/60">
            © 2026 Upper Vibe Media. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground/40 tracking-wider">
            STREAM THE FREQUENCY
          </p>
        </div>
      </div>
    </footer>
  );
}