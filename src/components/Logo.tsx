import logo from "@/assets/peticione-logo.png";
import icon from "@/assets/peticione-icon.png";
import { Link } from "@tanstack/react-router";

export function Logo({ className = "h-9" }: { className?: string }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2">
      <img src={logo} alt="Peticione.AI" className={className} />
    </Link>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return <img src={icon} alt="Peticione.AI" width={size} height={size} style={{ height: size, width: size, objectFit: "contain" }} />;
}

export function LogoFull({ className = "h-24" }: { className?: string }) {
  return <img src={logo} alt="Peticione.AI" className={className} style={{ objectFit: "contain" }} />;
}