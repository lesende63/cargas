from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import statistics
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

SPRING_BACK = 0.001
HEADSPACE_REDUCTION = 0.002

# ---------------------------------------------------------------------------
# Caliber presets (bullet diameter + headspace datum diameter, in inches)
# ---------------------------------------------------------------------------
CALIBER_PRESETS = {
    ".223 Remington": {"bullet_diameter": 0.224, "headspace_datum": 0.330},
    "6mm BR Norma": {"bullet_diameter": 0.243, "headspace_datum": 0.400},
    "6mm Dasher": {"bullet_diameter": 0.243, "headspace_datum": 0.400},
    "6mm Creedmoor": {"bullet_diameter": 0.243, "headspace_datum": 0.400},
    "6.5x47 Lapua": {"bullet_diameter": 0.264, "headspace_datum": 0.400},
    "6.5 Creedmoor": {"bullet_diameter": 0.264, "headspace_datum": 0.400},
    "6.5 PRC": {"bullet_diameter": 0.264, "headspace_datum": 0.400},
    ".284 Winchester": {"bullet_diameter": 0.284, "headspace_datum": 0.420},
    "7mm WSM": {"bullet_diameter": 0.284, "headspace_datum": 0.420},
    ".308 Winchester": {"bullet_diameter": 0.308, "headspace_datum": 0.400},
    ".30-06 Springfield": {"bullet_diameter": 0.308, "headspace_datum": 0.375},
    ".300 WSM": {"bullet_diameter": 0.308, "headspace_datum": 0.420},
    ".300 Winchester Magnum": {"bullet_diameter": 0.308, "headspace_datum": 0.420},
}


def r3(x: float) -> float:
    return round(x, 3)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    caliber: str
    case_brand: str
    case_lot: str
    bullet_diameter: Optional[float] = None
    headspace_datum: Optional[float] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class ProjectCreate(BaseModel):
    caliber: str
    case_brand: str
    case_lot: str
    bullet_diameter: Optional[float] = None
    headspace_datum: Optional[float] = None


class ProjectUpdate(BaseModel):
    caliber: Optional[str] = None
    case_brand: Optional[str] = None
    case_lot: Optional[str] = None
    bullet_diameter: Optional[float] = None
    headspace_datum: Optional[float] = None
    data: Optional[Dict[str, Any]] = None


class BushingInput(BaseModel):
    neck_fired: float          # medida cuello vaina disparada
    neck_wall_thickness: float  # grosor pared cuello
    bullet_diameter: float      # diametro bala
    neck_tension: float = 0.002  # tension deseada


class HeadspaceInput(BaseModel):
    fired_measurement: float
    datum: Optional[float] = None


class CaseInput(BaseModel):
    case_number: int
    empty: Optional[float] = None
    full: Optional[float] = None


class VolumeGroupsInput(BaseModel):
    cases: List[CaseInput]
    max_spread: float = 0.5


class ChargeLadderInput(BaseModel):
    start: float
    end: float
    step: float = 0.3


class GroupStatsInput(BaseModel):
    velocities: List[Optional[float]]


class SeatingLadderInput(BaseModel):
    max_cbto: float
    bullet_type: str = "hybrid"  # hybrid | vld
    step: float = 0.003
    max_jump: float = 0.030


class PrimerLadderInput(BaseModel):
    pocket_depth: float
    primer_height: float
    step: float = 0.002
    groups: int = 6


class RecommendEntry(BaseModel):
    charge: float
    es: Optional[float] = None
    sd: Optional[float] = None
    ocw_y: Optional[float] = None


class RecommendInput(BaseModel):
    mode: str = "both"  # velocity | ocw | both
    entries: List[RecommendEntry]


class PowderDataInput(BaseModel):
    caliber: str
    bullet_brand: str
    bullet_weight: str   # e.g. "200gr"
    powder_brand: str
    powder_model: str


# ---------------------------------------------------------------------------
# Calculation helpers
# ---------------------------------------------------------------------------
def calc_group_stats(velocities: List[Optional[float]]):
    vals = [float(v) for v in velocities if v is not None and v != ""]
    if len(vals) == 0:
        return {"avg": None, "es": None, "sd": None, "count": 0}
    avg = round(statistics.mean(vals), 1)
    es = round(max(vals) - min(vals), 1)
    sd = round(statistics.stdev(vals), 1) if len(vals) >= 2 else None
    return {"avg": avg, "es": es, "sd": sd, "count": len(vals)}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "F-Class Reloading API"}


@api_router.get("/caliber-presets")
async def get_caliber_presets():
    return {"presets": CALIBER_PRESETS}


# ---- Projects CRUD --------------------------------------------------------
@api_router.post("/projects", response_model=Project)
async def create_project(payload: ProjectCreate):
    preset = CALIBER_PRESETS.get(payload.caliber, {})
    obj = Project(
        caliber=payload.caliber,
        case_brand=payload.case_brand,
        case_lot=payload.case_lot,
        bullet_diameter=payload.bullet_diameter if payload.bullet_diameter is not None else preset.get("bullet_diameter"),
        headspace_datum=payload.headspace_datum if payload.headspace_datum is not None else preset.get("headspace_datum"),
    )
    await db.projects.insert_one(obj.model_dump())
    return obj


@api_router.get("/projects", response_model=List[Project])
async def list_projects():
    docs = await db.projects.find({}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return [Project(**d) for d in docs]


@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return Project(**doc)


@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, payload: ProjectUpdate):
    doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    updates = payload.model_dump(exclude_none=True)
    if "data" in updates:
        merged = {**doc.get("data", {}), **updates["data"]}
        updates["data"] = merged
    updates["updated_at"] = now_iso()
    await db.projects.update_one({"id": project_id}, {"$set": updates})
    new_doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return Project(**new_doc)


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    res = await db.projects.delete_one({"id": project_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return {"deleted": True}


# ---- Calculations ---------------------------------------------------------
@api_router.post("/calc/bushing")
async def calc_bushing(inp: BushingInput):
    chamber_neck = r3(inp.neck_fired + SPRING_BACK)
    loaded_neck = r3(inp.bullet_diameter + 2 * inp.neck_wall_thickness)
    clearance = r3(chamber_neck - loaded_neck)
    bushing_ideal = r3(loaded_neck - inp.neck_tension)
    bushing_recommended = r3(bushing_ideal - SPRING_BACK)
    expander_recommended = bushing_ideal
    estimated_tension = r3(inp.bullet_diameter - (expander_recommended - 2 * inp.neck_wall_thickness))
    return {
        "chamber_neck": chamber_neck,
        "loaded_neck": loaded_neck,
        "clearance": clearance,
        "bushing_recommended": bushing_recommended,
        "expander_recommended": expander_recommended,
        "estimated_tension": estimated_tension,
        "spring_back": SPRING_BACK,
    }


@api_router.post("/calc/headspace")
async def calc_headspace(inp: HeadspaceInput):
    optimal = r3(inp.fired_measurement - HEADSPACE_REDUCTION)
    return {
        "datum": inp.datum,
        "fired_measurement": r3(inp.fired_measurement),
        "reduction": HEADSPACE_REDUCTION,
        "optimal_headspace": optimal,
    }


@api_router.post("/calc/volume-groups")
async def calc_volume_groups(inp: VolumeGroupsInput):
    measured = []
    for c in inp.cases:
        if c.empty is not None and c.full is not None and c.full != "" and c.empty != "":
            vol = round(float(c.full) - float(c.empty), 2)
            measured.append({"case_number": c.case_number, "volume": vol})
    measured.sort(key=lambda x: x["volume"])
    groups = []
    current = []
    for m in measured:
        if not current:
            current = [m]
            continue
        if round(m["volume"] - current[0]["volume"], 3) <= inp.max_spread:
            current.append(m)
        else:
            groups.append(current)
            current = [m]
    if current:
        groups.append(current)
    result = []
    for i, g in enumerate(groups):
        vols = [x["volume"] for x in g]
        result.append({
            "group": i + 1,
            "case_numbers": [x["case_number"] for x in g],
            "count": len(g),
            "min_volume": min(vols),
            "max_volume": max(vols),
            "avg_volume": round(statistics.mean(vols), 2),
            "spread": round(max(vols) - min(vols), 2),
        })
    return {"groups": result, "total_cases": len(measured)}


@api_router.post("/calc/group-stats")
async def calc_group_stats_route(inp: GroupStatsInput):
    return calc_group_stats(inp.velocities)


@api_router.post("/calc/charge-ladder")
async def calc_charge_ladder(inp: ChargeLadderInput):
    charges = []
    val = inp.start
    # build inclusive range avoiding float drift
    n = int(round((inp.end - inp.start) / inp.step)) + 1 if inp.end >= inp.start else 0
    for i in range(max(n, 0)):
        charges.append(round(inp.start + i * inp.step, 3))
    if not charges:
        charges = [round(inp.start, 3)]
    return {"charges": charges}


@api_router.post("/calc/seating-ladder")
async def calc_seating_ladder(inp: SeatingLadderInput):
    steps = int(round(inp.max_jump / inp.step))
    entries = []
    # jump out of lands: offset negative (cbto shorter)
    jam_part = []
    if inp.bullet_type.lower() == "vld":
        # allow seating into lands (jam) in same increments, up to 0.015"
        jam_steps = int(round(0.015 / inp.step))
        for i in range(jam_steps, 0, -1):
            offset = round(i * inp.step, 3)
            jam_part.append({"offset": offset, "cbto": r3(inp.max_cbto + offset), "label": f"+{offset:.3f} (en estría)"})
    for i in range(0, steps + 1):
        offset = round(-i * inp.step, 3)
        label = "0.000 (toque)" if i == 0 else f"{offset:.3f} (salto)"
        entries.append({"offset": offset, "cbto": r3(inp.max_cbto + offset), "label": label})
    return {"entries": jam_part + entries}


@api_router.post("/calc/primer-ladder")
async def calc_primer_ladder(inp: PrimerLadderInput):
    base = r3(inp.pocket_depth - inp.primer_height)
    entries = []
    for i in range(inp.groups):
        pretension = 0.0 if i == 0 else round(i * inp.step, 3)
        entries.append({
            "group": i + 1,
            "pretension": pretension,
            "seating_depth": r3(base + pretension),
        })
    return {"base_depth": base, "entries": entries}


@api_router.post("/calc/recommend-charge")
async def recommend_charge(inp: RecommendInput):
    entries = inp.entries
    explanation = []
    recommended = []

    def velocity_best():
        scored = [(e.charge, e.es + e.sd) for e in entries if e.es is not None and e.sd is not None]
        if not scored:
            return []
        scored.sort(key=lambda x: x[1])
        best_score = scored[0][1]
        return [c for c, s in scored if s <= best_score + 0.01]

    def ocw_window():
        pts = [(e.charge, e.ocw_y) for e in entries if e.ocw_y is not None]
        if len(pts) < 3:
            return [], None
        best = None
        for i in range(len(pts) - 2):
            window = pts[i:i + 3]
            ys = [w[1] for w in window]
            rng = max(ys) - min(ys)
            if best is None or rng < best[0]:
                best = (rng, window)
        if best is None:
            return [], None
        return [w[0] for w in best[1]], round(best[0], 2)

    if inp.mode == "velocity":
        recommended = velocity_best()
        explanation.append("Cargas con menor ES + SD combinados.")
    elif inp.mode == "ocw":
        win, rng = ocw_window()
        recommended = win
        explanation.append(f"Nodo OCW con menor variación vertical de impactos ({rng} mm).")
    else:  # both
        win, rng = ocw_window()
        vel = velocity_best()
        if win:
            inter = [c for c in win if c in vel] if vel else win
            recommended = inter if inter else win
            explanation.append(f"Nodo OCW (variación {rng} mm)" + (" cruzado con mejor ES/SD." if inter else "."))
        else:
            recommended = vel
            explanation.append("Sin datos OCW suficientes; se usó ES + SD.")

    return {"recommended_charges": recommended, "explanation": " ".join(explanation)}


@api_router.post("/powder-data")
async def powder_data(inp: PowderDataInput):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY no configurada")

    system = (
        "Eres una base de datos de referencia de recarga para tiradores expertos de competición F-Class. "
        "Tu función es reproducir los rangos de carga publicados en los manuales oficiales de los fabricantes "
        "de pólvora (Hodgdon, Vihtavuori, Alliant, etc.). Estos datos son públicos y conocidos. "
        "SIEMPRE proporcionas tu mejor estimación numérica basada en los datos publicados; NUNCA te niegas "
        "ni devuelves ceros. Respondes EXCLUSIVAMENTE con un objeto JSON válido, sin texto adicional ni markdown."
    )
    prompt = (
        f"Calibre: {inp.caliber}. Punta: {inp.bullet_brand} {inp.bullet_weight}. "
        f"Pólvora: {inp.powder_brand} {inp.powder_model}. "
        "Indica la carga mínima (inicial) y la carga máxima publicadas por el fabricante para esta combinación, "
        "expresadas en grains. Si no existe un dato exacto para esa punta, usa el de un peso de punta equivalente. "
        'Devuelve EXCLUSIVAMENTE este JSON: {"min_grains": <numero>, "max_grains": <numero>, '
        '"notes": "<recordatorio breve en español de empezar por la mínima y verificar signos de sobrepresión>"}. '
        "Los números deben ser realistas y mayores que cero."
    )
    chat = LlmChat(api_key=api_key, session_id=f"powder-{uuid.uuid4()}", system_message=system).with_model("gemini", "gemini-3-flash-preview")
    try:
        resp = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al consultar datos de pólvora: {e}")

    text = resp.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]
    try:
        parsed = json.loads(text)
        min_g = float(parsed["min_grains"])
        max_g = float(parsed["max_grains"])
    except Exception:
        raise HTTPException(status_code=502, detail="No se pudo interpretar la respuesta de datos de pólvora")

    return {
        "min_grains": round(min_g, 2),
        "max_grains": round(max_g, 2),
        "max_plus_10": round(max_g * 1.10, 2),
        "notes": parsed.get("notes", ""),
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
