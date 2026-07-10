"use client";

import { CheckCircle2, RotateCcw, Ruler, Save, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { MeasurementFigure } from "@/components/product/measurement-figure";
import {
  EMPTY_MEASUREMENTS,
  MEASUREMENT_FIELDS,
  MEASUREMENT_STORAGE_KEY,
  type MeasurementDraft,
  type MeasurementField,
  getMeasurementField,
  parseSavedMeasurementProfile,
  validateMeasurementDraft,
} from "@/lib/measurements";
import type { FitPreference } from "@/types/commerce";

export function InteractiveMeasurementGuide() {
  const [measurements, setMeasurements] = useState<MeasurementDraft>({
    ...EMPTY_MEASUREMENTS,
  });
  const [activeField, setActiveField] = useState<MeasurementField>("bust");
  const [fitPreference, setFitPreference] = useState<FitPreference>("regular");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = parseSavedMeasurementProfile(
      window.localStorage.getItem(MEASUREMENT_STORAGE_KEY),
    );
    if (saved) {
      setMeasurements(saved.values);
      setFitPreference(saved.fitPreference);
      setNotes(saved.notes);
      setConfirmed(saved.customerConfirmed);
    }
    setHydrated(true);
  }, []);

  const requiredFields = MEASUREMENT_FIELDS.filter((field) => field.required);
  const completedRequired = requiredFields.filter(
    (field) => measurements[field.key].trim() !== "",
  ).length;
  const progress = Math.round((completedRequired / requiredFields.length) * 100);
  const active = getMeasurementField(activeField) ?? MEASUREMENT_FIELDS[0];

  const orderedFields = useMemo(
    () => [active, ...MEASUREMENT_FIELDS.filter((field) => field.key !== active.key)],
    [active],
  );

  const setMeasurement = (field: MeasurementField, value: string) => {
    setMeasurements((current) => ({ ...current, [field]: value }));
    setConfirmed(false);
  };

  const selectField = (field: MeasurementField) => {
    setActiveField(field);
    window.requestAnimationFrame(() => {
      document.getElementById(`guide-${field}`)?.focus({ preventScroll: true });
    });
  };

  const save = () => {
    const validationError = validateMeasurementDraft(measurements);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (!confirmed) {
      toast.error("Confirm that you measured and checked every required value twice.");
      return;
    }

    window.localStorage.setItem(
      MEASUREMENT_STORAGE_KEY,
      JSON.stringify({
        values: measurements,
        fitPreference,
        notes: notes.trim(),
        customerConfirmed: true,
        savedAt: Date.now(),
      }),
    );
    toast.success("Measurements saved. Product pages will now prefill these values.");
  };

  const reset = () => {
    setMeasurements({ ...EMPTY_MEASUREMENTS });
    setFitPreference("regular");
    setNotes("");
    setConfirmed(false);
    setActiveField("bust");
    window.localStorage.removeItem(MEASUREMENT_STORAGE_KEY);
    toast.success("Saved measurements cleared.");
  };

  return (
    <main className="bg-[#FFF8EF] py-12 sm:py-16">
      <div className="section-shell">
        <div className="mx-auto max-w-3xl text-center">
          <Ruler className="mx-auto h-10 w-10 text-[#B8893B]" />
          <p className="eyebrow mt-5">Interactive custom-size guide</p>
          <h1 className="font-display mt-4 text-5xl leading-none text-[#171717] sm:text-6xl">
            Measure once. Check twice. Save your fit.
          </h1>
          <p className="mt-5 text-sm leading-7 text-[#5F5348]">
            Tap a marker on the dressed model, enter the matching measurement in
            inches, and confirm every required value before shopping.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,1.1fr)] lg:items-start">
          <div className="lg:sticky lg:top-32">
            <MeasurementFigure
              activeField={activeField}
              onSelect={selectField}
              className="min-h-[38rem] sm:min-h-[45rem]"
            />
            <div className="mt-4 rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="eyebrow">Selected point</p>
                  <h2 className="font-display mt-2 text-3xl text-[#171717]">
                    {active.label}
                  </h2>
                </div>
                <span className="rounded-full bg-[#F6E9DD] px-3 py-1 text-xs font-bold text-[#6E0F1A]">
                  {active.required ? "Required" : "Optional"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#5F5348]">
                {active.instruction}
              </p>
            </div>
          </div>

          <section className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5 shadow-[0_18px_50px_rgba(83,54,22,0.08)] sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Your measurements</p>
                <h2 className="font-display mt-2 text-4xl text-[#171717]">
                  Enter values in inches
                </h2>
              </div>
              <span className="text-xs font-bold text-[#5F5348]">
                {completedRequired}/{requiredFields.length} required complete
              </span>
            </div>
            <div
              className="mt-5 h-2 overflow-hidden rounded-full bg-[#F6E9DD]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Required measurement completion"
            >
              <div
                className="h-full rounded-full bg-[#B8893B] transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {orderedFields.map((field) => (
                <div
                  key={field.key}
                  className={`rounded-xl border p-4 transition ${
                    activeField === field.key
                      ? "border-[#B8893B] bg-[#F6E9DD]"
                      : "border-[#E9DCCB] bg-[#FFF8EF]"
                  }`}
                >
                  <label htmlFor={`guide-${field.key}`} className="field-label">
                    {field.label} {field.required ? "*" : "(optional)"}
                  </label>
                  <div className="relative">
                    <input
                      id={`guide-${field.key}`}
                      type="number"
                      inputMode="decimal"
                      min={field.min}
                      max={field.max}
                      step="0.25"
                      value={measurements[field.key]}
                      onFocus={() => setActiveField(field.key)}
                      onChange={(event) => setMeasurement(field.key, event.target.value)}
                      className="field !pr-12"
                      aria-describedby={`guide-${field.key}-hint`}
                      required={field.required}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6F6255]">
                      in
                    </span>
                  </div>
                  <p id={`guide-${field.key}-hint`} className="mt-2 text-xs leading-5 text-[#5F5348]">
                    {field.hint}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="guide-fit" className="field-label">Fit preference</label>
                <select
                  id="guide-fit"
                  value={fitPreference}
                  onChange={(event) => {
                    setFitPreference(event.target.value as FitPreference);
                    setConfirmed(false);
                  }}
                  className="field"
                >
                  <option value="close">Close fit</option>
                  <option value="regular">Regular fit</option>
                  <option value="relaxed">Relaxed fit</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="guide-notes" className="field-label">Tailoring notes (optional)</label>
                <textarea
                  id="guide-notes"
                  value={notes}
                  onChange={(event) => {
                    setNotes(event.target.value);
                    setConfirmed(false);
                  }}
                  maxLength={500}
                  className="field min-h-24 resize-y"
                  placeholder="Neck depth, sleeve style, comfort or mobility notes"
                />
              </div>
            </div>

            <label className="mt-6 flex items-start gap-3 rounded-xl border border-[#B8893B]/35 bg-[#F6E9DD] p-4 text-xs leading-5 text-[#5F5348]">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5 accent-[#B8893B]"
              />
              I measured in inches over fitted clothing, kept the tape level,
              and checked every required value twice.
            </label>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={save} className="primary-button w-full">
                <Save className="h-4 w-4" />
                Save measurements
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={!hydrated}
                className="secondary-button w-full"
              >
                <RotateCcw className="h-4 w-4" />
                Clear saved values
              </button>
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-[#6F6255]">
              Saved only in this browser. You can review and edit the values on
              every product before adding it to your cart.
            </p>
          </section>
        </div>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            [Ruler, "Use a soft tape", "Wear fitted clothing and stand naturally. Do not pull the tape tight."],
            [CheckCircle2, "Check every number", "Repeat each required measurement and resolve any difference before saving."],
            [ShieldCheck, "Admin review", "The tailoring team must approve measurements before an order can be confirmed."],
          ].map(([Icon, title, text]) => {
            const GuideIcon = Icon as typeof Ruler;
            return (
              <article key={String(title)} className="rounded-2xl border border-[#E9DCCB] bg-[#FFFDF8] p-5">
                <GuideIcon className="h-5 w-5 text-[#B8893B]" />
                <h2 className="font-display mt-4 text-2xl text-[#171717]">{String(title)}</h2>
                <p className="mt-2 text-sm leading-6 text-[#5F5348]">{String(text)}</p>
              </article>
            );
          })}
        </section>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/collection" className="primary-button">Shop custom-size designs</Link>
          <Link href="/size-guide" className="secondary-button">Open body reference chart</Link>
          <Link href="/support" className="secondary-button">Ask for measurement help</Link>
        </div>
      </div>
    </main>
  );
}
