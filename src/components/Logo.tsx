import logoAsset from "@/assets/agriland-logo.png.asset.json";

export function Logo({
  className = "h-8 w-8",
  alt = "Ansem Land logo",
}: {
  className?: string;
  alt?: string;
}) {
  return <img src={logoAsset.url} alt={alt} className={className} loading="eager" />;
}

export const logoUrl = logoAsset.url;
