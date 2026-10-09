from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import warnings

warnings.filterwarnings("ignore", category=UserWarning)

app = FastAPI(title="SmartPower AI Engine")

# --- ADD THIS CORS VIP PASS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- LOAD AI MODELS ---
print("Waking up AI models...")
# UPDATE: We are now loading the new compressed model so Vercel/Render doesn't crash!
rf_model = joblib.load('compressed_model.joblib', mmap_mode='r')
iso_forest = joblib.load('anomaly_detection_model.pkl')
print("AI is online!")

# --- DATA STRUCTURES (What React sends us) ---
class OptimizationRequest(BaseModel):
    appliance_name: str
    power_kw: float
    duration_hours: int
    start_limit: int
    end_limit: int

class PredictionRequest(BaseModel):
    hour: int
    day_of_week: int
    is_weekend: int
    month: int
    power_24h_ago: float
    rolling_6h_avg: float

class AnomalyRequest(BaseModel):
    global_active_power: float
    hour: int

# --- UTILITY FUNCTION ---
def get_hourly_price(hour: int):
    if 18 <= hour <= 22:
        return 8.00
    else:
        return 4.00

# --- ENDPOINT 1: OPTIMIZATION ---
@app.post("/api/optimize")
def optimize_schedule(req: OptimizationRequest):
    best_start_time = None
    lowest_cost = float('inf')

    for start_hour in range(req.start_limit, req.end_limit - req.duration_hours + 1):
        cost = sum([req.power_kw * get_hourly_price(h) for h in range(start_hour, start_hour + req.duration_hours)])
        if cost < lowest_cost:
            lowest_cost = cost
            best_start_time = start_hour

    worst_case_cost = sum([req.power_kw * get_hourly_price(h) for h in range(19, 19 + req.duration_hours)])
    
    return {
        "appliance": req.appliance_name,
        "recommended_start_hour": best_start_time,
        "estimated_savings_rupees": round(worst_case_cost - lowest_cost, 2)
    }

# --- ENDPOINT 2: PREDICTION ---
@app.post("/api/predict")
def predict_power(req: PredictionRequest):
    # Pack the incoming data into a 2D array exactly how the model likes it
    features = [[req.hour, req.day_of_week, req.is_weekend, req.month, req.power_24h_ago, req.rolling_6h_avg]]
    prediction = rf_model.predict(features)[0]
    return {"predicted_power_kw": round(prediction, 3)}

# --- ENDPOINT 3: ANOMALY DETECTION ---
@app.post("/api/anomaly")
def detect_anomaly(req: AnomalyRequest):
    features = [[req.global_active_power, req.hour]]
    prediction = iso_forest.predict(features)[0]
    # The model outputs -1 if it's an anomaly, 1 if normal
    is_abnormal = True if prediction == -1 else False
    return {"is_anomaly": is_abnormal}

