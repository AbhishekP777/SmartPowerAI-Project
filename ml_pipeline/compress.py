import joblib
import os

print("Loading massive 239MB model...")
# Use joblib to load it instead of pickle
model = joblib.load('power_prediction_model.pkl')

print("Compressing... This might take 30 seconds.")
joblib.dump(model, 'compressed_model.joblib', compress=9)

old_size = os.path.getsize('power_prediction_model.pkl') / (1024 * 1024)
new_size = os.path.getsize('compressed_model.joblib') / (1024 * 1024)

print(f"✅ Done! Original: {old_size:.1f} MB -> New: {new_size:.1f} MB")