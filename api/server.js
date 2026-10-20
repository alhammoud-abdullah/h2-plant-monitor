const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());          // erlaubt dem React-Dashboard später den Zugriff
app.use(express.json());  // damit wir JSON im Request-Body lesen können

// Vorerst speichern wir alles im Arbeitsspeicher (Azure kommt in Phase 2)
const measurements = [];

// Messwert annehmen
app.post("/measurements", (req, res) => {
  const { powerKw, h2Kg, temperatureC } = req.body;

  if (powerKw == null || h2Kg == null || temperatureC == null) {
    return res.status(400).json({ error: "powerKw, h2Kg und temperatureC sind Pflicht" });
  }

  const entry = {
    id: measurements.length + 1,
    timestamp: new Date().toISOString(),
    powerKw,
    h2Kg,
    temperatureC,
  };
  measurements.push(entry);
  res.status(201).json(entry);
});

// Alle Messwerte ausgeben
app.get("/measurements", (req, res) => {
  res.json(measurements);
});

// Azure gibt den Port über die Umgebungsvariable PORT vor, lokal nehmen wir 3000
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API läuft auf Port ${PORT}`);
});