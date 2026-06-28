"""Backend integration tests for F-Class Reload Lab API."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to public URL embedded in frontend env
    with open("/app/frontend/.env") as fh:
        for line in fh:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- root / presets ---
def test_root(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert "message" in r.json()


def test_presets_contains_308(session):
    r = session.get(f"{API}/caliber-presets")
    assert r.status_code == 200
    data = r.json()["presets"]
    assert ".308 Winchester" in data
    assert data[".308 Winchester"]["bullet_diameter"] == 0.308
    assert data[".308 Winchester"]["headspace_datum"] == 0.400


# --- projects CRUD ---
@pytest.fixture(scope="session")
def created_project(session):
    body = {"caliber": ".308 Winchester", "case_brand": "Lapua", "case_lot": "TEST_A1"}
    r = session.post(f"{API}/projects", json=body)
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["caliber"] == ".308 Winchester"
    assert p["bullet_diameter"] == 0.308
    assert p["headspace_datum"] == 0.400
    assert "id" in p
    yield p
    session.delete(f"{API}/projects/{p['id']}")


def test_project_list_and_get(session, created_project):
    r = session.get(f"{API}/projects")
    assert r.status_code == 200
    ids = [p["id"] for p in r.json()]
    assert created_project["id"] in ids
    r2 = session.get(f"{API}/projects/{created_project['id']}")
    assert r2.status_code == 200
    assert r2.json()["case_lot"] == "TEST_A1"


def test_project_update_persists(session, created_project):
    pid = created_project["id"]
    patch = {"data": {"bushing": {"neck_fired": 0.343}}}
    r = session.put(f"{API}/projects/{pid}", json=patch)
    assert r.status_code == 200
    # merge update
    patch2 = {"data": {"headspace": {"datum": 0.400}}}
    session.put(f"{API}/projects/{pid}", json=patch2)
    r = session.get(f"{API}/projects/{pid}")
    d = r.json()["data"]
    assert d["bushing"]["neck_fired"] == 0.343
    assert d["headspace"]["datum"] == 0.400


# --- calculations ---
def test_calc_bushing(session):
    body = {"neck_fired": 0.343, "neck_wall_thickness": 0.015, "bullet_diameter": 0.308, "neck_tension": 0.002}
    r = session.post(f"{API}/calc/bushing", json=body)
    assert r.status_code == 200
    d = r.json()
    # expected from spec
    assert d["bushing_recommended"] == 0.335
    assert d["expander_recommended"] == 0.336
    assert d["estimated_tension"] == 0.002
    assert d["clearance"] == 0.006


def test_calc_headspace(session):
    r = session.post(f"{API}/calc/headspace", json={"fired_measurement": 1.630, "datum": 0.400})
    assert r.status_code == 200
    d = r.json()
    assert d["optimal_headspace"] == 1.628
    assert d["reduction"] == 0.002


def test_calc_volume_groups(session):
    cases = [
        {"case_number": 1, "empty": 100.00, "full": 150.10},
        {"case_number": 2, "empty": 100.00, "full": 150.20},
        {"case_number": 3, "empty": 100.00, "full": 151.00},  # spread breaks here
        {"case_number": 4, "empty": 100.00, "full": 151.10},
    ]
    r = session.post(f"{API}/calc/volume-groups", json={"cases": cases, "max_spread": 0.5})
    assert r.status_code == 200
    d = r.json()
    assert d["total_cases"] == 4
    assert len(d["groups"]) == 2
    assert sum(g["count"] for g in d["groups"]) == 4


def test_calc_charge_ladder(session):
    r = session.post(f"{API}/calc/charge-ladder", json={"start": 42.0, "end": 42.3, "step": 0.03})
    assert r.status_code == 200
    charges = r.json()["charges"]
    assert charges[0] == 42.0
    assert charges[-1] == 42.3
    assert len(charges) == 11


def test_calc_seating_ladder_hybrid(session):
    r = session.post(f"{API}/calc/seating-ladder", json={"max_cbto": 2.250, "bullet_type": "hybrid"})
    assert r.status_code == 200
    entries = r.json()["entries"]
    # no into-lands rows
    assert all(e["offset"] <= 0 for e in entries)
    assert entries[0]["cbto"] == 2.250  # 0 offset
    assert entries[-1]["offset"] == -0.030


def test_calc_seating_ladder_vld_has_into_lands(session):
    r = session.post(f"{API}/calc/seating-ladder", json={"max_cbto": 2.250, "bullet_type": "vld"})
    assert r.status_code == 200
    entries = r.json()["entries"]
    pos = [e for e in entries if e["offset"] > 0]
    neg = [e for e in entries if e["offset"] < 0]
    assert len(pos) > 0  # into-lands rows present
    assert len(neg) > 0  # jump rows present


def test_calc_primer_ladder(session):
    r = session.post(f"{API}/calc/primer-ladder", json={"pocket_depth": 0.129, "primer_height": 0.124, "groups": 4})
    assert r.status_code == 200
    d = r.json()
    entries = d["entries"]
    assert len(entries) == 4
    assert entries[0]["pretension"] == 0.0
    assert entries[0]["seating_depth"] == 0.005
    assert entries[1]["pretension"] == 0.002
    assert entries[1]["seating_depth"] == 0.007


def test_recommend_velocity(session):
    body = {"mode": "velocity", "entries": [
        {"charge": 42.0, "es": 20, "sd": 8},
        {"charge": 42.1, "es": 10, "sd": 4},
        {"charge": 42.2, "es": 15, "sd": 6},
    ]}
    r = session.post(f"{API}/calc/recommend-charge", json=body)
    assert r.status_code == 200
    assert 42.1 in r.json()["recommended_charges"]


def test_recommend_ocw(session):
    body = {"mode": "ocw", "entries": [
        {"charge": 42.0, "ocw_y": 10},
        {"charge": 42.1, "ocw_y": 12},
        {"charge": 42.2, "ocw_y": 12.1},  # tight node here
        {"charge": 42.3, "ocw_y": 12.05},
        {"charge": 42.4, "ocw_y": 20},
    ]}
    r = session.post(f"{API}/calc/recommend-charge", json=body)
    assert r.status_code == 200
    recs = r.json()["recommended_charges"]
    assert 42.1 in recs and 42.2 in recs and 42.3 in recs


# --- powder LLM ---
def test_powder_data_llm(session):
    body = {"caliber": ".308 Winchester", "bullet_brand": "Berger", "bullet_weight": "200gr",
            "powder_brand": "Hodgdon", "powder_model": "Varget"}
    r = session.post(f"{API}/powder-data", json=body, timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["min_grains"] > 0
    assert d["max_grains"] > d["min_grains"]
    assert abs(d["max_plus_10"] - round(d["max_grains"] * 1.1, 2)) < 0.05
