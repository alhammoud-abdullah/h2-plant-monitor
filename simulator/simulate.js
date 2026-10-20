// Adresse deiner API
const API_URL = "http://localhost:3000/measurements";
// alle 3 Sekunden ein neuer Messwert
const INTERVAL_MS = 3000;

// Zufallszahl um einen Basiswert herum, z. B. 1000 ± 50
function randomAround(base, spread) {
  return base + (Math.random() * 2 - 1) * spread;
}

// auf 2 Nachkommastellen runden
function round(value) {
  return Math.round(value * 100) / 100;
}

async function sendMeasurement() {
  // Stromverbrauch der Anlage in kW
  const powerKw = randomAround(1000, 50);

  // Effizienz: wie viele kWh Strom für 1 kg Wasserstoff nötig sind (realistisch ~55)
  let efficiency = randomAround(55, 2);

  // in 5 % der Fälle eine Störung: Effizienz 20 % schlechter
  const isAnomaly = Math.random() < 0.05;
  if (isAnomaly) {
    efficiency = efficiency * 1.2;
  }

  // produzierter Wasserstoff in kg pro Stunde
  const h2Kg = powerKw / efficiency;

  // Temperatur in °C, bei Störung etwas höher
  const temperatureC = randomAround(70, 3) + (isAnomaly ? 8 : 0);

  const measurement = {
    powerKw: round(powerKw),
    h2Kg: round(h2Kg),
    temperatureC: round(temperatureC),
  };

  try {
    // Messwert per POST an die API schicken
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(measurement),
    });
    const saved = await response.json();
    console.log(isAnomaly ? "⚠️ Anomalie gesendet:" : "Gesendet:", saved);
  } catch (err) {
    console.error("API nicht erreichbar – läuft node server.js im anderen Terminal?");
  }
}

// sofort einmal senden, danach alle 3 Sekunden
sendMeasurement();
setInterval(sendMeasurement, INTERVAL_MS);