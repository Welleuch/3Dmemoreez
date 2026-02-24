-- Migration 002: Add detailed Orders table schema
CREATE TABLE IF NOT EXISTS Orders (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    user_email TEXT,
    receiver_first_name TEXT,
    receiver_last_name TEXT,
    shipping_address TEXT,
    status TEXT DEFAULT 'pending',  -- pending | paid | printing | shipped
    price_cents INTEGER,
    material_grams REAL,
    print_duration_minutes INTEGER,
    gcode_r2_path TEXT,
    final_stl_r2_path TEXT,
    tracking_number TEXT,
    stripe_payment_intent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
