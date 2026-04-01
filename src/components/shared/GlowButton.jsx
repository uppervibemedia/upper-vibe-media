import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function GlowButton({ children, to, onClick, variant = "primary", size = "md", className = "" }) {
  const baseClasses = "inline-flex items-center justify-center font-heading font-semibold tracking-wider uppercase transition-all rounded-lg";

  const sizeClasses = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  const variantClasses = {
    primary: "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground glow-blue hover:shadow-[0_0_30px_hsl(185_100%_50%/0.3)]",
    secondary: "bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground glow-gold hover:shadow-[0_0_30px_hsl(43_72%_52%/0.3)]",
    outline: "border border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60",
    ghost: "text-foreground hover:bg-muted/30",
  };

  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  const Comp = to ? Link : "button";

  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
      <Comp to={to} onClick={onClick} className={classes}>
        {children}
      </Comp>
    </motion.div>
  );
}