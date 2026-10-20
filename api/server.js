const express = require("express");
const cors = require("cors");
const { CosmosClient } = require("@azure/cosmos");

const app = express();
app.use(cors());                     // erlaubt Zugriffe von anderen Adressen (z. B. lokales Dashboard)
app.use(express.json());             // damit wir JSON im Request-Body lesen können
app.use(express.static("public"));   // liefert die Dashboard-Dateien aus dem Ordner "public" aus

// ---------- Speicher: Cosmos DB oder Arbeitsspeicher ----------
// Sind COSMOS_ENDPOINT und COSMOS_KEY gesetzt, speichern wir in der Datenbank.
// Sonst (z. B. lokal ohne Zugangsdaten) wie bisher im Arbeitsspeicher.

let container = null;

if (process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY) {
  const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY,
  });
  container = client.database("h2monitor").container("measurements");
  console.log("Speicher: Cosmos DB");
} else {
  console.log("Speicher: Arbeitsspeicher (keine Cosmos-Zugangsdaten gesetzt)");
}

const measurements = [];    // nur benutzt, wenn keine Datenbank verbunden ist
const MAX_ENTRIES = 1000;   // höchstens so viele Werte im Arbeitsspeicher

// Speichert einen Messwert; wird von POST und vom Demo-Modus benutzt
async function addMeasurement(powerKw, h2Kg, temperatureC) {
  const entry = {
    id: crypto.randomUUID(),   // eindeutige ID, die Cosmos DB als Text verlangt
    plantId: "plant-1",        // zu welcher Anlage der Wert gehört (Partition Key)
    timestamp: new Date().toISOString(),
    powerKw,
    h2Kg,
    temperatureC,
  };

  if (container) {
    await container.items.create(entry);   // in Cosmos DB speichern
  } else {
    measurements.push(entry);
    if (measurements.length > MAX_ENTRIES) {
      measurements.shift();                // ältesten Wert entfernen
    }
  }
  return entry;
}

// Holt die neuesten 100 Messwerte, älteste zuerst
async function getMeasurements() {
  if (container) {
    const { resources } = await container.items
      .query("SELECT TOP 100 c.id, c.plantId, c.timestamp, c.powerKw, c.h2Kg, c.temperatureC FROM c ORDER BY c.timestamp DESC")
      .fetchAll();
    return resources.reverse();   // umdrehen, damit die Diagramme von links nach rechts laufen
  }
  return measurements;
}

// ---------- API-Endpunkte ----------

// Messwert annehmen (z. B. vom Simulator auf deinem Laptop)
app.post("/measurements", async (req, res) => {
  const { powerKw, h2Kg, temperatureC } = req.body;

  if (powerKw == null || h2Kg == null || temperatureC == null) {
    return res.status(400).json({ error: "powerKw, h2Kg und temperatureC sind Pflicht" });
  }

  try {
    const entry = await addMeasurement(powerKw, h2Kg, temperatureC);
    res.status(201).json(entry);
  } catch (err) {
    console.error("Fehler beim Speichern:", err.message);
    res.status(500).json({ error: "Messwert konnte nicht gespeichert werden" });
  }
});

// Messwerte ausgeben
app.get("/measurements", async (req, res) => {
  try {
    res.json(await getMeasurements());
  } catch (err) {
    console.error("Fehler beim Lesen:", err.message);
    res.status(500).json({ error: "Messwerte konnten nicht gelesen werden" });
  }
});

// ---------- Demo-Modus ----------
// Ist DEMO_MODE auf "true" gesetzt, erzeugt der Server selbst alle 3 Sekunden Messwerte.

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

    addMeasurement(round(powerKw), round(h2Kg), round(temperatureC))
      .catch((err) => console.error("Demo-Wert nicht gespeichert:", err.message));
  }, 3000);

  console.log("Demo-Modus aktiv: Der Server erzeugt selbst Messwerte");
}

// Azure gibt den Port über die Umgebungsvariable PORT vor, lokal nehmen wir 3000
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API läuft auf Port ${PORT}`);
});