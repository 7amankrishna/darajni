const defaultLabels: Array<[string, string]> = [
  ["Shoulder", "measure-shoulder"],
  ["Bust", "measure-bust"],
  ["Waist", "measure-waist"],
  ["Hip", "measure-hip"],
  ["Sleeve", "measure-sleeve"],
  ["Blouse length", "measure-blouse"],
  ["Lehenga length", "measure-length"],
];

export function MeasurementGuideFigure({
  labels = defaultLabels,
}: {
  labels?: Array<[string, string]>;
}) {
  return (
    <figure className="measurement-figure" aria-label="Illustrated woman demonstrating how to take custom-fit measurements">
      <div className="measurement-person" aria-hidden="true">
        <Image
          src="/images/measurement-guide-woman.png"
          alt=""
          fill
          sizes="(max-width: 640px) 70vw, 28rem"
          className="object-contain object-bottom"
        />
      </div>

      <figcaption className="measurement-caption">
        <span>Made-to-measure guide</span>
        Keep the tape comfortably close, without pulling it tight.
      </figcaption>

      {labels.map(([label, className]) => (
        <span key={label} className={`measure-label ${className}`}>
          {label}
        </span>
      ))}
    </figure>
  );
}
import Image from "next/image";
