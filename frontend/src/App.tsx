import { useEffect, useState } from "react";
import styled from "styled-components";
import ChargerTable from "./components/ChargerTable.tsx";

type Mapping = {
  name: string;
  serial: string;
};

type Status = {
  serial: string;
  data: { [key: string]: any };
};

/* -------- Styled Components -------- */
const Container = styled.div`
  min-height: 100vh;
  background-color: #f3f4f6;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  gap: 1.5rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 800;
  color: #0a7f3dff;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
`;

const Card = styled.div`
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  width: 100%;
  max-width: 28rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const Select = styled.select`
  width: 100%;
  border: 1px solid #d1d5db;
  padding: 0.5rem;
  border-radius: 0.5rem;
  outline: none;
  transition: 0.2s;
  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px #c7d2fe;
  }
`;

const StatusCard = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
  width: 100%;
  max-width: 32rem;
`;

const StatusTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
`;

const StatusRow = styled.div`
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
`;

const Key = styled.span`
  font-weight: 600;
  color: #374151;
`;

const Value = styled.span<{ available?: boolean }>`
  color: ${(props) => (props.available ? "#16a34a" : "#1f2937")};
  font-weight: ${(props) => (props.available ? "600" : "400")};
`;

const TableWrapper = styled.div`
  width: 100%;
  max-width: 72rem;
`;

const Button = styled.button<{ variant?: "primary" | "secondary" }>`
  background: ${(p) => (p.variant === "secondary" ? "#9ab1baff" : "#16a34a")};
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  margin-right: 0.5rem;
  transition: background 0.2s;
  &:hover {
    background: ${(p) =>
      p.variant === "secondary" ? "#4b5563" : "#4338ca"};
  }
`;

const Form = styled.form`
  background: white;
  padding: 1rem;
  border-radius: 0.75rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  max-width: 28rem;
  width: 100%;
  margin-bottom: 1rem;
`;

const Input = styled.input`
  width: 95%;
  padding: 0.5rem;
  margin-left: 2px;
  margin-right: 2px;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
`;


export default function ChargerDashboard() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [status, setStatus] = useState<Status | null>(null);
  const [newName, setNewName] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch("http://localhost:8000/mappings")
      .then((res) => res.json())
      .then(setMappings);
  }, []);

  useEffect(() => {
    if (!selected) return;

    const fetchStatus = () =>
      fetch(`http://localhost:8000/status/${selected}`)
        .then((res) => res.json())
        .then(setStatus);

    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);

    return () => clearInterval(interval);
  }, [selected]);

  const handleAddCharger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newSerial) return;

    try {
      const res = await fetch("http://localhost:8000/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, serial: newSerial }),
      });

      if (!res.ok) throw new Error("Failed to add charger");

      setMappings((prev) => [...prev, { name: newName, serial: newSerial }]);
      setNewName("");
      setNewSerial("");
      setShowForm(false); // auto-hide form after adding
    } catch (err) {
      console.error("Error adding charger:", err);
    }
  };


  return (
    <Container>
      <Title>⚡ EVSE Status Dashboard</Title>

      {/* Charger Selector */}
      <Card>
        <Label htmlFor="chargerSelect">Select Charger</Label>
        <Select
          id="chargerSelect"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">-- Select Charger --</option>
          {mappings.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name} ({m.serial})
            </option>
          ))}
        </Select>
      </Card>

      {/* Status Card */}
      {status && (
        <StatusCard>
          <StatusTitle>
            Status for <span style={{ color: "#4f46e5" }}>{selected}</span>
          </StatusTitle>
          <p>
            <Key>Serial:</Key> <span>{status.serial}</span>
          </p>
          <div style={{ marginTop: "1rem" }}>
            {status.data &&
              Object.entries(status.data).map(([k, v]) => (
                <StatusRow key={k}>
                  <Key>{k}:</Key>{" "}
                  <Value available={typeof v === "string" && v.includes("Available")}>
                    {String(v)}
                  </Value>
                </StatusRow>
              ))}
          </div>
        </StatusCard>
      )}

   {/* Add Charger Form */}
      {showForm && (
        <Form onSubmit={handleAddCharger}>
          <h2 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
            Add Charger
          </h2>
          <Input
            type="text"
            placeholder="Charger Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            type="text"
            placeholder="Charger Serial"
            value={newSerial}
            onChange={(e) => setNewSerial(e.target.value)}
          />
          <Button type="submit">Add</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </Button>
        </Form>
      )}

      <Button
            type="button"
            variant="secondary"
            onClick={() => setShowForm(true)}
          >
            Add Charger
        </Button>

      {/* Charger Table */}
      <TableWrapper>
        <ChargerTable />
      </TableWrapper>
    </Container>
  );
}
