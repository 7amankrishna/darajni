import type { FitPreference } from "@/types/commerce";

export type MeasurementField =
  | "shoulder"
  | "bust"
  | "waist"
  | "hips"
  | "outfitLength"
  | "sleeveLength"
  | "height";

export type MeasurementDraft = Record<MeasurementField, string>;

export interface SavedMeasurementProfile {
  values: MeasurementDraft;
  fitPreference: FitPreference;
  notes: string;
  customerConfirmed: boolean;
  savedAt: number;
}

export const MEASUREMENT_STORAGE_KEY = "darajni-measurements-v1";

export const EMPTY_MEASUREMENTS: MeasurementDraft = {
  shoulder: "",
  bust: "",
  waist: "",
  hips: "",
  outfitLength: "",
  sleeveLength: "",
  height: "",
};

export const MEASUREMENT_FIELDS: ReadonlyArray<{
  key: MeasurementField;
  label: string;
  hint: string;
  instruction: string;
  min: number;
  max: number;
  required: boolean;
}> = [
  {
    key: "shoulder",
    label: "Shoulder",
    hint: "Back, edge to edge",
    instruction: "Measure straight across the back from one shoulder edge to the other.",
    min: 8,
    max: 30,
    required: true,
  },
  {
    key: "bust",
    label: "Bust",
    hint: "Around the fullest part",
    instruction: "Wrap the tape around the fullest part of the bust and keep it level.",
    min: 20,
    max: 80,
    required: true,
  },
  {
    key: "waist",
    label: "Waist",
    hint: "Around the natural waist",
    instruction: "Measure around the natural waist without pulling the tape tight.",
    min: 18,
    max: 80,
    required: true,
  },
  {
    key: "hips",
    label: "Hips",
    hint: "Around the fullest part",
    instruction: "Stand with feet together and measure around the fullest part of the hips.",
    min: 20,
    max: 90,
    required: true,
  },
  {
    key: "outfitLength",
    label: "Outfit length",
    hint: "Shoulder to desired hem",
    instruction: "Start at the highest shoulder point and measure to the desired hem.",
    min: 20,
    max: 80,
    required: true,
  },
  {
    key: "sleeveLength",
    label: "Sleeve length",
    hint: "Shoulder point to cuff",
    instruction: "Measure from the shoulder point down the arm to the preferred cuff.",
    min: 0,
    max: 40,
    required: false,
  },
  {
    key: "height",
    label: "Height",
    hint: "Barefoot, head to floor",
    instruction: "Stand barefoot against a wall and measure from the floor to the top of the head.",
    min: 40,
    max: 90,
    required: false,
  },
];

export function getMeasurementField(key: MeasurementField) {
  return MEASUREMENT_FIELDS.find((field) => field.key === key);
}

export function validateMeasurementDraft(values: MeasurementDraft) {
  for (const field of MEASUREMENT_FIELDS) {
    const rawValue = values[field.key].trim();
    if (!rawValue && !field.required) continue;
    const value = Number(rawValue);
    if (!rawValue || !Number.isFinite(value) || value < field.min || value > field.max) {
      return `${field.label} must be between ${field.min} and ${field.max} inches.`;
    }
  }
  return null;
}

export function parseSavedMeasurementProfile(
  raw: string | null,
): SavedMeasurementProfile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedMeasurementProfile>;
    if (!parsed.values || typeof parsed.values !== "object") return null;

    const values = { ...EMPTY_MEASUREMENTS };
    for (const field of MEASUREMENT_FIELDS) {
      const value = (parsed.values as Record<string, unknown>)[field.key];
      values[field.key] = typeof value === "string" ? value : "";
    }
    if (validateMeasurementDraft(values)) return null;

    const fitPreference: FitPreference = ["close", "regular", "relaxed"].includes(
      String(parsed.fitPreference),
    )
      ? (parsed.fitPreference as FitPreference)
      : "regular";

    return {
      values,
      fitPreference,
      notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 500) : "",
      customerConfirmed: parsed.customerConfirmed === true,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}
