import Image from "next/image";

const markers = [
  ["Shoulder", "measure-shoulder"],
  ["Bust", "measure-bust"],
  ["Waist", "measure-waist"],
  ["Hips", "measure-hip"],
  ["Sleeve", "measure-sleeve"],
  ["Outfit length", "measure-length"],
] as const;

export function MeasurementFigure({ className = "" }: { className?: string }) {
  return (
    <div className={`measurement-figure ${className}`}>
      <Image
        src="/measurement-model.webp"
        alt="Front-facing woman wearing a maroon dress in a neutral measurement pose"
        fill
        sizes="(max-width: 1024px) 100vw, 42vw"
        className="measurement-model object-contain"
      />
      {markers.map(([label, markerClass]) => (
        <span key={label} className={`measure-label ${markerClass}`}>
          {label}
        </span>
      ))}
    </div>
  );
}
