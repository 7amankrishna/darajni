"use client";

import Image from "next/image";

import type { MeasurementField } from "@/lib/measurements";

const markers: ReadonlyArray<[string, string, MeasurementField]> = [
  ["Shoulder", "measure-shoulder", "shoulder"],
  ["Bust", "measure-bust", "bust"],
  ["Waist", "measure-waist", "waist"],
  ["Hips", "measure-hip", "hips"],
  ["Sleeve", "measure-sleeve", "sleeveLength"],
  ["Height", "measure-height", "height"],
  ["Outfit length", "measure-length", "outfitLength"],
] as const;

export function MeasurementFigure({
  className = "",
  activeField = null,
  onSelect,
}: {
  className?: string;
  activeField?: MeasurementField | null;
  onSelect?: (field: MeasurementField) => void;
}) {
  return (
    <div className={`measurement-figure measurement-figure-model ${className}`}>
      <Image
        src="/measurement-model-transparent.png"
        alt="Front-facing woman wearing a maroon dress in a measurement pose"
        fill
        sizes="(max-width: 1024px) 100vw, 42vw"
        className="measurement-model object-contain"
      />
      {markers.map(([label, markerClass, field]) =>
        onSelect ? (
          <button
            key={field}
            type="button"
            onClick={() => onSelect(field)}
            aria-pressed={activeField === field}
            className={`measure-label measure-label-button ${markerClass} ${
              activeField === field ? "is-active" : ""
            }`}
          >
            {label}
          </button>
        ) : (
          <span key={field} className={`measure-label ${markerClass}`}>
            {label}
          </span>
        ),
      )}
    </div>
  );
}
