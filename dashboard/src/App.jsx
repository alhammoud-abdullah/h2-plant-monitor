import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// Adresse deiner API
const API_URL = "http://localhost:3000/measurements";

// Ab dieser Effizienz (kWh pro kg) zeigen wir eine Warnung
const EFFICIENCY_LIMIT = 60;

function App() {
  // useState = eine Variable, bei deren Änderung React die Seite neu zeichnet
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  // useEffect = Code, der beim Start der Seite einmal ausgeführt wird
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(API_URL);
        const json = await res.json();

        // nur die letzten 30 Werte anzeigen und Effizienz berechnen
        const prepared = json.slice(-30).map((m) => ({
          ...m,
          time: new Date(m.timestamp).toLocaleTimeString("de-DE"),
          efficiency: Math.round((m.powerKw / m.h2Kg) * 10) / 10,
        }));

        setData(prepared);
        setError(null);
      } catch {
        setError("API nicht erreichbar – läuft node server.js?");
      }
    }

    load();                               // sofort einmal laden
    const id = setInterval(load, 3000);   // danach alle 3 Sekunden
    return () => clearInterval(id);       // aufräumen, wenn die Seite geschlossen wird
  }, []);

  // der neueste Messwert für die Kacheln oben
  const latest = data[data.length - 1];
  const isWarning = latest && latest.efficiency > EFFICIENCY_LIMIT;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <h1>H2 Plant Monitor</h1>
      <p style={{ color: "#666" }}>Live-Daten eines simulierten Elektrolyseurs</p>

      {error && <div style={styles.error}>{error}</div>}

      {isWarning && (
        <div style={styles.error}>
          ⚠️ Effizienz auffällig: {latest.efficiency} kWh/kg (Normal: ca. 55)
        </div>
      )}

      {latest && (
        <div style={styles.cards}>
          <Card title="Stromverbrauch" value={latest.powerKw} unit="kW" />
          <Card title="H2-Produktion" value={latest.h2Kg} unit="kg/h" />
          <Card title="Effizienz" value={latest.efficiency} unit="kWh/kg" />
          <Card title="Temperatur" value={latest.temperatureC} unit="°C" />
        </div>
      )}

      <Chart title="H2-Produktion (kg/h)" data={data} dataKey="h2Kg" color="#2e7d32" />
      <Chart title="Stromverbrauch (kW)" data={data} dataKey="powerKw" color="#1565c0" />
      <Chart title="Effizienz (kWh pro kg H2) – niedriger ist besser" data={data} dataKey="efficiency" color="#c62828" />
    </div>
  );
}

// Kachel für einen einzelnen Wert
function Card({ title, value, unit }) {
  return (
    <div style={styles.card}>
      <div style={{ color: "#666", fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 600 }}>
        {value} <span style={{ fontSize: 16 }}>{unit}</span>
      </div>
    </div>
  );
}

// Liniendiagramm für einen Messwert
function Chart({ title, data, dataKey, color }) {
  return (
    <div style={styles.chartBox}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis domain={["auto", "auto"]} />
          <Tooltip />
          <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Aussehen der Elemente
const styles = {
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  card: { background: "white", borderRadius: 8, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  chartBox: { background: "white", borderRadius: 8, padding: 16, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  error: { background: "#ffebee", color: "#c62828", padding: 12, borderRadius: 8, marginBottom: 16 },
};

export default App;