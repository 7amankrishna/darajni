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
    <div className="measurement-figure" aria-label="Female measurement dummy with marked body points">
      <div className="measurement-dummy" aria-hidden="true">
        <span className="dummy-head" />
        <span className="dummy-neck" />
        <span className="dummy-torso">
          <span className="dummy-mark dummy-mark-shoulder" />
          <span className="dummy-mark dummy-mark-bust" />
          <span className="dummy-mark dummy-mark-waist" />
          <span className="dummy-mark dummy-mark-hip" />
          <span className="dummy-centerline" />
        </span>
        <span className="dummy-arm dummy-arm-left" />
        <span className="dummy-arm dummy-arm-right" />
        <span className="dummy-leg dummy-leg-left" />
        <span className="dummy-leg dummy-leg-right" />
        <span className="dummy-length-line" />
      </div>

      {labels.map(([label, className]) => (
        <span key={label} className={`measure-label ${className}`}>
          {label}
        </span>
      ))}
    </div>
  );
}
