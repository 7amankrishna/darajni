import logoUrl from "../../logo.png";

export default function BrandLogo({
  className = "h-12 w-12",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <img
      src={logoUrl}
      alt="DARAJNI sewing emblem"
      className={`${className} rounded-full object-cover`}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}
