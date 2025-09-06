from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from bs4 import BeautifulSoup
import sqlite3, httpx, os, secrets

DB_PATH = os.getenv("DB_PATH", "chargers.db")
NOODOE_API = "https://ocpp-cs-prod.noodoe.com/status/"

app = FastAPI()

origins = [
    "http://localhost:3000",   
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://my-frontend.onrender.com"


]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        # or ["*"] to allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Mapping(BaseModel):
    name: str
    serial: str

# ----- DB Helpers -----
def get_conn():
    return sqlite3.connect(DB_PATH)

def init_db():
    conn = get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS charger_mappings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            serial TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ----- Endpoints -----
@app.get("/mappings")
def list_mappings():
    conn = get_conn()
    rows = conn.execute("SELECT name, serial FROM charger_mappings").fetchall()
    conn.close()
    return [{"name": r[0], "serial": r[1]} for r in rows]

@app.post("/mappings")
def add_mapping(mapping: Mapping):
    conn = get_conn()
    try:
        conn.execute("INSERT INTO charger_mappings (name, serial) VALUES (?, ?)",
                     (mapping.name, mapping.serial))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))
    conn.close()
    return {"status": "ok"}

@app.put("/mappings/{name}")
def update_mapping(name: str, mapping: Mapping):
    conn = get_conn()
    result = conn.execute(
        "UPDATE charger_mappings SET serial=?, updated_at=CURRENT_TIMESTAMP WHERE name=?",
        (mapping.serial, name)
    )
    conn.commit()
    conn.close()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Mapping not found")
    return {"status": "updated"}

@app.get("/status/{name}")
async def get_status(name: str):
    conn = get_conn()
    row = conn.execute("SELECT serial FROM charger_mappings WHERE name=?", (name,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Name not found")
    serial = row[0]

    url = f"{NOODOE_API}{serial}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)

    if resp.status_code != 200:
        return {"error": f"Failed to fetch {serial}", "status": resp.status_code}

    soup = BeautifulSoup(resp.text, "html.parser")

    # Extract lines inside <body>
    body_text = soup.body.get_text(separator="\n", strip=True)

    parsed = {}
    for line in body_text.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            parsed[key.strip()] = value.strip()

    return {
        "serial": serial,
        "data": parsed
    }

from bs4 import BeautifulSoup
import httpx

# @app.get("/all")
# async def get_all_status():
#     return [{"name": "test", "serial": "123", "data": {"UpdatedAt": "demo"}}]


@app.get("/all")
async def get_all_status():
    conn = get_conn()
    rows = conn.execute("SELECT name, serial FROM charger_mappings").fetchall()
    conn.close()

    results = []
    async with httpx.AsyncClient() as client:
        for r in rows:
            name, serial = r
            url = f"{NOODOE_API}{serial}"
            try:
                resp = await client.get(url, timeout=10.0)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "html.parser")
                    body_text = soup.body.get_text(separator="\n", strip=True)
                    parsed = {}
                    for line in body_text.splitlines():
                        if ":" in line:
                            key, value = line.split(":", 1)
                            parsed[key.strip()] = value.strip()
                    results.append({
                        "name": name,
                        "serial": serial,
                        "data": parsed
                    })
                else:
                    results.append({
                        "name": name,
                        "serial": serial,
                        "error": f"HTTP {resp.status_code}"
                    })
            except Exception as e:
                results.append({"name": name, "serial": serial, "error": str(e)})

    return results

@app.delete("/mappings/{name}")
def delete_mapping(name: str):
    conn = get_conn()
    result = conn.execute("DELETE FROM charger_mappings WHERE name=?", (name,))
    conn.commit()
    conn.close()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Mapping not found")

    return {"status": "deleted", "name": name}
