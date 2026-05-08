import logo from "@/assets/peticione-logo.png";
import { Link } from "@tanstack/react-router";

export function Logo({ className = "h-9" }: { className?: string }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2">
      <img src={logo} alt="Peticione.AI" className={className} width={512} height={512} />
    </Link>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return <img src={logo} alt="Peticione.AI" width={size} height={size} style={{ height: size, width: size }} />;
}