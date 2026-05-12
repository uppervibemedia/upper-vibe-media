import React from "react";
import { Link } from "react-router-dom";
import { Waves } from "lucide-react";

const footerLinks = [
  {
    title: "Music",
    links: [
      { label: "All Music", to: "/music" },
      { label: "Categories", to: "/categories" },
      { label: "Downloads", to: "/downloads" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t mt-10" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(4,4,14,0.8)" }}>
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src="https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png"
                alt="Upper Vibe Media"
                className="w-8 h-8 object-contain"
              />
              <div>
                <p className="font-heading font-black text-xs tracking-[0.2em] text-white">UPPER VIBE</p>
                <p className="text-[9px] tracking-wider text-yellow-400/50 uppercase">Media</p>
              </div>
            </div>
            <p className="text-xs text-white/30 leading-relaxed max-w-[200px]">
              A private high-vibration music vault and learning hub for conscious listeners.
            </p>
            <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold tracking-widest uppercase"
              style={{ color: "#00E5FF" }}>
              <Waves className="w-3 h-3" /> Stream The Frequency
            </div>
          </div>

          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="text-[10px] font-black tracking-[0.2em] uppercase text-white/30 mb-4">
                {group.title}
              </h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-xs text-white/40 hover:text-white/80 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="text-[10px] text-white/20">
            © 2026 Upper Vibe Media. All rights reserved.
          </p>
          <p className="text-[10px] tracking-[0.25em] uppercase text-white/15">
            Frequency is Everything
          </p>
        </div>
      </div>
    </footer>
  );
}