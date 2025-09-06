import { useEffect, useState } from "react";
import styled from "styled-components";

type ChargerStatus = {
  name: string;
  serial: string;
  data?: { [key: string]: any };
  error?: string;
};

const allColumns = [
  { key: "name", label: "Name" },
  { key: "serial", label: "Serial" },
  { key: "UpdatedAt", label: "UpdatedAt" },
  { key: "Vendor", label: "Vendor" },
  { key: "Model", label: "Model" },
  { key: "Firmware Code", label: "Firmware Code" },
  { key: "Connector #1", label: "Connector #1" },
  { key: "Connector #2", label: "Connector #2" },
];

/* -------- Styled Components -------- */
const Wrapper = styled.div`
  padding: 1.5rem;
`;

const Title = styled.h1`
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #1f2937;
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
`;

const Button = styled.button<{ variant?: "green" | "red" }>`
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  color: white;
  border-radius: 0.375rem;
  background: ${(p) => (p.variant === "red" ? "#dc2626" : "#16a34a")};
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: ${(p) => (p.variant === "red" ? "#b91c1c" : "#15803d")};
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
`;

const Th = styled.th`
  padding: 0.5rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  text-align: left;
  font-weight: 600;
  color: #374151;
`;

const Tr = styled.tr`
  &:hover {
    background: #f9fafb;
  }
`;

const Td = styled.td<{ connector?: boolean; available?: boolean }>`
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  font-weight: ${(p) => (p.connector ? "600" : "400")};
  color: ${(p) =>
    p.connector
      ? p.available
        ? "#16a34a"
        : "#dc2626"
      : "#111827"};
`;

export default function ChargerTable() {
  const [statuses, setStatuses] = useState<ChargerStatus[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    allColumns.map((c) => c.key)
  );

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const res = await fetch("http://localhost:8000/all");
        const data = await res.json();
        if (Array.isArray(data)) {
          setStatuses(data);
        } else {
          console.error("Unexpected response:", data);
          setStatuses([]);
        }
      } catch (err) {
        console.error("Error fetching statuses:", err);
        setStatuses([]);
      }
    };

    fetchStatuses();
    const interval = setInterval(fetchStatuses, 5_000);
    return () => clearInterval(interval);
  }, []);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const showAll = () => setVisibleColumns(allColumns.map((c) => c.key));
  const hideAll = () => setVisibleColumns([]);

  return (
    <Wrapper>
      <Title>All Chargers Status</Title>

      {/* Column toggle checkboxes */}
      <Controls>
        {allColumns.map((col) => (
          <CheckboxLabel key={col.key}>
            <input
              type="checkbox"
              checked={visibleColumns.includes(col.key)}
              onChange={() => toggleColumn(col.key)}
            />
            {col.label}
          </CheckboxLabel>
        ))}
        <Button onClick={showAll} variant="green">
          Show All
        </Button>
        <Button onClick={hideAll} variant="red">
          Hide All
        </Button>
      </Controls>

      {/* Table */}
      <Table>
        <thead>
          <tr>
            {allColumns
              .filter((col) => visibleColumns.includes(col.key))
              .map((col) => (
                <Th key={col.key}>{col.label}</Th>
              ))}
          </tr>
        </thead>
        <tbody>
          {statuses.map((s) => (
            <Tr key={s.serial}>
              {allColumns
                .filter((col) => visibleColumns.includes(col.key))
                .map((col) => {
                  let value: string | undefined;

                  if (col.key === "name") value = s.name;
                  else if (col.key === "serial") value = s.serial;
                  else value = s.data?.[col.key];

                  if (col.key.startsWith("Connector")) {
                    return (
                      <Td
                        key={col.key}
                        connector
                        available={value?.includes("Available")}
                      >
                        {value || "N/A"}
                      </Td>
                    );
                  }

                  return <Td key={col.key}>{value || "N/A"}</Td>;
                })}
            </Tr>
          ))}
        </tbody>
      </Table>
    </Wrapper>
  );
}
