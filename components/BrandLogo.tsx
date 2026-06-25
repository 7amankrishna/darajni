import Image from "next/image";

export default function BrandLogo({
  className = "h-12 w-12",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo.webp"
      alt="DARAJNI sewing emblem"
      className={`${className} rounded-full object-cover`}
      width={512}
      height={512}
      priority={priority}
    />
  );
}
