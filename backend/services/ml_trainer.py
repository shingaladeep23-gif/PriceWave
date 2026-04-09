import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

def generate_synthetic_data(num_samples=15000):
    np.random.seed(42)
    # Features: clicks, views, stock, base_price
    clicks = np.random.randint(0, 5000, num_samples)
    views = clicks + np.random.randint(0, 2000, num_samples) # views always >= clicks
    stock = np.random.randint(0, 250, num_samples)
    base_price = np.random.uniform(5.0, 500.0, num_samples)
    
    # Calculate CTR and demand pressure
    ctr = clicks / (views + 1)
    demand_pressure = (clicks / 5000) * 0.5 + (ctr * 0.5)
    
    # Scarcity (0 stock doesn't trigger scarcity markup usually as you can't buy it, but let's say 1-20 is scarce)
    scarcity = np.where(stock == 0, 0, np.where(stock <= 20, 1.0 - (stock/20.0), 0))
    # Clearance urgency (>100 stock means clearance mode)
    clearance = np.where(stock > 100, (stock-100)/150.0, 0)
    
    # Formulate multiplier
    multiplier = 1.0 + (demand_pressure * 0.8) + (scarcity * 0.5) - (clearance * 0.3)
    
    # Enforce realistic boundaries
    # The firm boundaries requested are 23% min (77% discount) and 200% max (100% over base)
    multiplier = np.clip(multiplier, 0.23, 2.0)
    
    X = pd.DataFrame({
        'clicks': clicks,
        'views': views,
        'stock': stock,
        'base_price': base_price
    })
    y = multiplier
    
    return X, y

def train_model():
    print("Generating synthetic data...")
    X, y = generate_synthetic_data()
    
    print("Training Random Forest Regressor...")
    model = RandomForestRegressor(n_estimators=20, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X, y)
    
    score = model.score(X, y)
    print(f"Model R^2 Score on Synthetic Data: {score:.4f}")
    
    model_path = os.path.join(os.path.dirname(__file__), "pricing_model.joblib")
    joblib.dump(model, model_path)
    print(f"Model saved efficiently to {model_path}")

if __name__ == "__main__":
    train_model()
