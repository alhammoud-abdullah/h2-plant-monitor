const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());                     // erlaubt Zugriffe von anderen Adressen (z. B. lokales Dashboard)
app.use(express.json());             // damit wir JSON im Request-Body lesen können
app.use(express.static("public"));   // liefert die Dashboard-Dateien aus dem Ordner "public" aus

// Messwerte im Arbeitsspeicher (Datenbank kommt in Etappe 3)
const measurements = [];
const MAX_ENTRIES = 1000;   // höchstens so viele Werte behalten, damit der Speicher nicht vollläuft
let nextId = 1;             // fortlaufende Nummer für jeden Messwert

// Speichert einen Messwert; wird von POST und vom Demo-Modus benutzt
function addMeasurement(powerKw, h2Kg, temperatureC) {
  const entry = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    powerKw,
    h2Kg,
    temperatureC,
  };
  measurements.push(entry);
  if (measurements.length > MAX_ENTRIES) {
    measurements.shift();   // ältesten Wert entfernen
  }
  return entry;
}

// Messwert annehmen (z. B. vom Simulator auf deinem Laptop)
app.post("/measurements", (req, res) => {
  const { powerKw, h2Kg, temperatureC } = req.body;

  if (powerKw == null || h2Kg == null || temperatureC == null) {
    return res.status(400).json({ error: "powerKw, h2Kg und temperatureC sind Pflicht" });
  }

  const entry = addMeasurement(powerKw, h2Kg, temperatureC);
  res.status(201).json(entry);
});

// Alle Messwerte ausgeben
app.get("/measurements", (req, res) => {
  res.json(measurements);
});

// ---------- Demo-Modus ----------
// Ist DEMO_MODE auf "true" gesetzt, erzeugt der Server selbst alle 3 Sekunden Messwerte.
// So zeigt das Dashboard online immer Live-Daten, auch wenn dein Laptop aus ist.

function randomAround(base, spread) {
  return base + (Math.random() * 2 - 1) * spread;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

if (process.env.DEMO_MODE === "true") {
  setInterval(() => {
    const powerKw = randomAround(1000, 50);
    let efficiency = randomAround(55, 2);          // kWh pro kg H2, normal ca. 55
    const isAnomaly = Math.random() < 0.05;        // in 5 % der Fälle eine Störung
    if (isAnomaly) {
      efficiency = efficiency * 1.2;               // Effizienz 20 % schlechter
    }
    const h2Kg = powerKw / efficiency;
    const temperatureC = randomAround(70, 3) + (isAnomaly ? 8 : 0);

    addMeasurement(round(powerKw), round(h2Kg), round(temperatureC));
  }, 3000);

  console.log("Demo-Modus aktiv: Der Server erzeugt selbst Messwerte");
}

// Azure gibt den Port über die Umgebungsvariable PORT vor, lokal nehmen wir 3000
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API läuft auf Port ${PORT}`);
});