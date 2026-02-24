-- D1 Schema for 3Dmemoreez

CREATE TABLE IF NOT EXISTS Sessions (
    id TEXT PRIMARY KEY,
    current_step TEXT DEFAULT 'input',
    hobbies_json TEXT,
    selected_concept_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS Assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    session_id TEXT,
    image_url TEXT,
    stl_r2_path TEXT,
    gcode_r2_path TEXT,
    model_volume REAL,
    status TEXT DEFAULT 'generated', -- generated | processing | completed | failed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES Orders(id),
    FOREIGN KEY (session_id) REFERENCES Sessions(id)
);
