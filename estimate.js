export const PUMP_NAMES = {
  water: "PAC air / eau",
  air: "PAC air / air",
  unsure: "Solution à déterminer"
};

export const PERIOD_NAMES = {
  old: "logement ancien peu isolé",
  mid: "isolation moyenne (1975–2000)",
  recent: "bonne isolation (2001–2012)",
  new: "construction récente (après 2012)"
};

export const HOUSING_NAMES = {
  house: "maison",
  apartment: "appartement"
};

export const COMPLEXITY_NAMES = {
  simple: "accès simple et réseau compatible",
  standard: "installation standard",
  complex: "accès ou adaptations complexes"
};

// Coefficients simplifiés en W/m³.K. Une visite et un calcul NF EN 12831 restent nécessaires.
const HEAT_LOSS = { old: 1.4, mid: 1.1, recent: 0.85, new: 0.65 };
const DEFAULT_HEIGHT_M = 2.5;
const DEFAULT_DELTA_T = 27;

// Référentiel marché français TTC avant aides, novembre 2026.
// Air/eau : hypothèse habituelle d'un logement > 2 ans, TVA 5,5 %.
const AIR_WATER_TIERS = [
  { maxKw: 6, equipment: [6000, 7800], labor: [2300, 3400], extras: [300, 1200] },
  { maxKw: 8, equipment: [6800, 9000], labor: [2500, 3900], extras: [400, 1500] },
  { maxKw: 10, equipment: [7800, 10300], labor: [2800, 4400], extras: [500, 1800] },
  { maxKw: 12, equipment: [8800, 11800], labor: [3000, 4800], extras: [700, 2000] },
  { maxKw: 16, equipment: [10000, 13500], labor: [3500, 5500], extras: [800, 3000] }
];

// Air/air : équipement à 20 %, pose et travaux à 10 % pour un logement > 2 ans.
const AIR_AIR_TIERS = [
  { maxRooms: 1, equipment: [1300, 2800], labor: [700, 1300], extras: [0, 400], referenceKw: 2.5 },
  { maxRooms: 2, equipment: [2500, 4500], labor: [1200, 2200], extras: [200, 700], referenceKw: 4 },
  { maxRooms: 3, equipment: [3500, 5800], labor: [1700, 2800], extras: [300, 900], referenceKw: 5.5 },
  { maxRooms: 4, equipment: [4500, 7500], labor: [2200, 3500], extras: [400, 1200], referenceKw: 7 },
  { maxRooms: 6, equipment: [6000, 10500], labor: [3000, 5000], extras: [500, 1500], referenceKw: 10 }
];

const roundHundred = (value) => Math.round(value / 100) * 100;
const scaleRange = (range, factor) => range.map((value) => roundHundred(value * factor));
const addRanges = (...ranges) => [
  ranges.reduce((sum, range) => sum + range[0], 0),
  ranges.reduce((sum, range) => sum + range[1], 0)
];

function validateInput(input) {
  const surface = Number(input.surfaceM2);
  const rooms = Number(input.rooms);
  if (!Number.isFinite(surface) || surface < 20 || surface > 500) {
    throw new RangeError("La surface doit être comprise entre 20 et 500 m².");
  }
  if (!Number.isInteger(rooms) || rooms < 1 || rooms > 12) {
    throw new RangeError("Le nombre de pièces doit être compris entre 1 et 12.");
  }
  if (!(input.pumpType in PUMP_NAMES)) throw new RangeError("Type de pompe inconnu.");
  if (!(input.buildingPeriod in PERIOD_NAMES)) throw new RangeError("Niveau d'isolation inconnu.");
  if (!(input.housingType in HOUSING_NAMES)) throw new RangeError("Type de logement inconnu.");
  if (!(input.complexity in COMPLEXITY_NAMES)) throw new RangeError("Complexité inconnue.");
  return { surface, rooms };
}

function calculateHeatLoss(input, surface) {
  const housingFactor = input.housingType === "apartment" ? 0.88 : 1;
  return surface * DEFAULT_HEIGHT_M * HEAT_LOSS[input.buildingPeriod] * DEFAULT_DELTA_T * housingFactor / 1000;
}

function complexityFactors(complexity) {
  if (complexity === "simple") return { labor: 0.9, extras: 0.7 };
  if (complexity === "complex") return { labor: 1.22, extras: 1.5 };
  return { labor: 1, extras: 1 };
}

function applyVatForNewHousing(range, typicalRate, overTwoYears) {
  if (overTwoYears) return range;
  return range.map((value) => roundHundred(value / (1 + typicalRate) * 1.2));
}

function airWaterBreakdown(input, requiredKw) {
  const tier = AIR_WATER_TIERS.find((item) => requiredKw <= item.maxKw) || AIR_WATER_TIERS.at(-1);
  const factors = complexityFactors(input.complexity);
  const apartmentLaborFactor = input.housingType === "apartment" ? 1.05 : 1;
  let equipment = [...tier.equipment];
  let labor = scaleRange(tier.labor, factors.labor * apartmentLaborFactor);
  let extras = scaleRange(tier.extras, factors.extras);

  if (input.domesticHotWater) {
    equipment = addRanges(equipment, [1500, 2500]);
    labor = addRanges(labor, [200, 500]);
  }

  equipment = applyVatForNewHousing(equipment, 0.055, input.overTwoYears);
  labor = applyVatForNewHousing(labor, 0.055, input.overTwoYears);
  extras = applyVatForNewHousing(extras, 0.055, input.overTwoYears);

  return {
    equipment,
    labor,
    extras,
    vatLabel: input.overTwoYears
      ? "TVA 5,5 % présumée, sous réserve d’éligibilité technique et fiscale"
      : "TVA 20 % estimée pour un logement de moins de 2 ans",
    installationTime: input.complexity === "complex" ? "3 à 5 jours" : "2 à 4 jours"
  };
}

function airAirBreakdown(input, requiredKw, rooms) {
  const tier = AIR_AIR_TIERS.find((item) => rooms <= item.maxRooms) || AIR_AIR_TIERS.at(-1);
  const extraRoomsFactor = rooms > 6 ? 1 + (rooms - 6) * 0.12 : 1;
  // Ajustement limité : la puissance influence le matériel sans écraser le prix lié au nombre d'unités.
  const powerFactor = Math.max(0.9, Math.min(1.2, requiredKw / tier.referenceKw));
  const factors = complexityFactors(input.complexity);
  const apartmentLaborFactor = input.housingType === "apartment" ? 1.05 : 1;

  const equipment = scaleRange(tier.equipment, powerFactor * extraRoomsFactor);
  let labor = scaleRange(tier.labor, factors.labor * apartmentLaborFactor * extraRoomsFactor);
  let extras = scaleRange(tier.extras, factors.extras * extraRoomsFactor);

  // Le matériel air/air reste à 20 %. Seules la pose et certaines améliorations passent typiquement à 10 %.
  labor = applyVatForNewHousing(labor, 0.1, input.overTwoYears);
  extras = applyVatForNewHousing(extras, 0.1, input.overTwoYears);

  return {
    equipment,
    labor,
    extras,
    vatLabel: input.overTwoYears
      ? "Matériel à 20 % ; pose estimée à 10 %, sous réserve d’éligibilité"
      : "TVA 20 % estimée sur le matériel et la pose",
    installationTime: input.complexity === "complex" ? "2 à 5 jours" : "1 à 3 jours"
  };
}

export function calculateEstimate(input) {
  const { surface, rooms } = validateInput(input);
  const requiredKw = calculateHeatLoss(input, surface);
  const breakdown = input.pumpType === "air"
    ? airAirBreakdown(input, requiredKw, rooms)
    : airWaterBreakdown(input, requiredKw);
  const total = addRanges(breakdown.equipment, breakdown.labor, breakdown.extras);
  const powerLow = Math.max(2, Math.floor(requiredKw * 0.9));
  const powerHigh = Math.max(powerLow + 1, Math.ceil(requiredKw * 1.12));

  return {
    low: total[0],
    high: total[1],
    powerLow,
    powerHigh,
    calculatedHeatLossKw: Math.round(requiredKw * 10) / 10,
    installationTime: breakdown.installationTime,
    breakdown: {
      equipment: { low: breakdown.equipment[0], high: breakdown.equipment[1] },
      labor: { low: breakdown.labor[0], high: breakdown.labor[1] },
      extras: { low: breakdown.extras[0], high: breakdown.extras[1] }
    },
    vatLabel: breakdown.vatLabel,
    assumptions: {
      heightM: DEFAULT_HEIGHT_M,
      deltaT: DEFAULT_DELTA_T,
      rooms,
      domesticHotWater: Boolean(input.domesticHotWater),
      beforeAid: true
    }
  };
}
