import {
  calculateEstimate,
  COMPLEXITY_NAMES,
  HOUSING_NAMES,
  PERIOD_NAMES,
  PUMP_NAMES
} from "./estimate.js";

const $ = (selector) => document.querySelector(selector);
const surface = $("#surface");
const period = $("#built-year");
const rooms = $("#rooms");
const housingType = $("#housing-type");
const complexity = $("#complexity");
const buildingAge = $("#building-age");
const domesticHotWater = $("#domestic-hot-water");
const form = $("#quote-form");

function selectedPump() {
  return document.querySelector('input[name="pump"]:checked')?.value || "water";
}

function formatEuro(value) {
  return new Intl.NumberFormat("fr-FR").format(value) + " €";
}

function formatRange(range) {
  return `${formatEuro(range.low)} – ${formatEuro(range.high)}`;
}

function projectInput() {
  return {
    surfaceM2: Number(surface.value),
    rooms: Number(rooms.value),
    pumpType: selectedPump(),
    buildingPeriod: period.value,
    housingType: housingType.value,
    complexity: complexity.value,
    overTwoYears: buildingAge.value === "over",
    domesticHotWater: domesticHotWater.checked && selectedPump() !== "air"
  };
}

function calculate() {
  const project = projectInput();
  const estimate = calculateEstimate(project);
  $("#surface-output").textContent = `${project.surfaceM2} m²`;
  $("#estimate-price").textContent = `${formatEuro(estimate.low)} – ${formatEuro(estimate.high)}`;
  $("#equipment-price").textContent = formatRange(estimate.breakdown.equipment);
  $("#labor-price").textContent = formatRange(estimate.breakdown.labor);
  $("#extras-price").textContent = formatRange(estimate.breakdown.extras);
  $("#estimate-power").textContent = `${estimate.powerLow} à ${estimate.powerHigh} kW`;
  $("#estimate-time").textContent = estimate.installationTime;
  $("#vat-note").textContent = `${estimate.vatLabel}.`;
  $("#estimate-assumptions").textContent = `Hypothèses : hauteur 2,5 m, écart thermique 27 °C, ${COMPLEXITY_NAMES[project.complexity]}. Aucune aide n’est déduite.`;
  $("#recap-text").textContent = `${PUMP_NAMES[project.pumpType]} · ${project.surfaceM2} m² · ${project.rooms} pièce(s) · ${HOUSING_NAMES[project.housingType]} · ${PERIOD_NAMES[project.buildingPeriod]}`;
  domesticHotWater.disabled = project.pumpType === "air";
  if (project.pumpType === "air") domesticHotWater.checked = false;
  try {
    localStorage.setItem("bca-simulator", JSON.stringify(project));
  } catch {
    // Le simulateur reste fonctionnel si le stockage local est bloqué.
  }
  return project;
}

function restoreSimulator() {
  try {
    const saved = JSON.parse(localStorage.getItem("bca-simulator") || "null");
    if (!saved) return;
    if (saved.surfaceM2 >= 40 && saved.surfaceM2 <= 250) surface.value = saved.surfaceM2;
    if (saved.rooms >= 1 && saved.rooms <= 8) rooms.value = saved.rooms;
    if (PERIOD_NAMES[saved.buildingPeriod]) period.value = saved.buildingPeriod;
    if (HOUSING_NAMES[saved.housingType]) housingType.value = saved.housingType;
    if (COMPLEXITY_NAMES[saved.complexity]) complexity.value = saved.complexity;
    buildingAge.value = saved.overTwoYears === false ? "under" : "over";
    domesticHotWater.checked = Boolean(saved.domesticHotWater);
    const radio = document.querySelector(`input[name="pump"][value="${saved.pumpType}"]`);
    if (radio) radio.checked = true;
  } catch {
    // Aucune restauration si les données sont absentes ou invalides.
  }
}

function showError(message) {
  const error = $("#form-error");
  error.textContent = message;
  error.hidden = !message;
}

restoreSimulator();
calculate();

document.querySelectorAll('input[name="pump"], #surface, #rooms, #built-year, #housing-type, #complexity, #building-age, #domestic-hot-water').forEach((control) => {
  control.addEventListener("input", calculate);
  control.addEventListener("change", calculate);
});

$("#use-estimate").addEventListener("click", () => {
  $("#devis").scrollIntoView({ behavior: "smooth" });
  setTimeout(() => $("#full-name").focus({ preventScroll: true }), 450);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  showError("");
  if (!form.reportValidity()) return;

  const data = Object.fromEntries(new FormData(form));
  const estimate = calculate();
  const subject = encodeURIComponent("Demande de devis pompe à chaleur - BCA Énergies");
  const body = encodeURIComponent([
    `Nom : ${data.fullName || ""}`,
    `Code postal : ${data.postalCode || ""}`,
    `E-mail : ${data.email || ""}`,
    `Téléphone : ${data.phone || ""}`,
    `Projet : ${PUMP_NAMES[estimate.pumpType]}`,
    `Surface : ${estimate.surfaceM2} m²`,
    `Délai : ${data.timeline || ""}`,
    `Précisions : ${data.details || ""}`
  ].join("\n"));

  window.location.href = `mailto:contact@example.fr?subject=${subject}&body=${body}`;
});

$("#new-request").addEventListener("click", () => {
  form.reset();
  restoreSimulator();
  calculate();
  $("#success-panel").hidden = true;
  form.hidden = false;
  $("#full-name").focus();
});
