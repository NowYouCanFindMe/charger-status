import { useEffect, useState } from "react";
import styled from "styled-components";

const URL = "https://charger-status-backend.onrender.com";

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
  { key: "actions", label: "Actions" }, // ✅ delete button column
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
  cursor: pointer;
`;

const ScrollContainer = styled.div`
  overflow-x: auto;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
`;

const Table = styled.table`
  min-width: 800px;
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`;

const Th = styled.th`
  padding: 0.5rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  text-align: left;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
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
  white-space: nowrap;
`;

const RemoveBtn = styled.button`
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.75rem;
  transition: background 0.2s;
  &:hover {
    background: #b91c1c;
  }
`;

/* -------- Modal Styles -------- */
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalBox = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
`;

const ModalTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
`;

const ConfirmBtn = styled.button<{ variant?: "cancel" | "delete" }>`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: ${(p) =>
    p.variant === "delete" ? "#dc2626" : "#e5e7eb"};
  color: ${(p) => (p.variant === "delete" ? "white" : "#374151")};
  &:hover {
    background: ${(p) =>
      p.variant === "delete" ? "#b91c1c" : "#d1d5db"};
  }
`;

export default function ChargerTable() {
  const [statuses, setStatuses] = useState<ChargerStatus[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    allColumns.map((c) => c.key) // all visible by default
  );
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 5_000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatuses = async () => {
    try {
      const res = await fetch(URL + "/all");
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(URL + `/mappings/${deleteTarget}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setStatuses((prev) => prev.filter((s) => s.name !== deleteTarget));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <Wrapper>
      <Title>All Chargers Status</Title>

      {/* Column Toggle Controls */}
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
      </Controls>

      <ScrollContainer>
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
                    if (col.key === "actions") {
                      return (
                        <Td key="actions">
                          <RemoveBtn onClick={() => setDeleteTarget(s.name)}>
                            Remove
                          </RemoveBtn>
                        </Td>
                      );
                    }

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
      </ScrollContainer>

      {/* Confirm Delete Modal */}
      {deleteTarget && (
        <ModalOverlay>
          <ModalBox>
            <ModalTitle>
              Remove charger <span style={{ color: "#dc2626" }}>{deleteTarget}</span>?
            </ModalTitle>
            <p>This action cannot be undone.</p>
            <ModalActions>
              <ConfirmBtn variant="cancel" onClick={() => setDeleteTarget(null)}>
                Cancel
              </ConfirmBtn>
              <ConfirmBtn variant="delete" onClick={confirmDelete}>
                Delete
              </ConfirmBtn>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}
    </Wrapper>
  );
}
