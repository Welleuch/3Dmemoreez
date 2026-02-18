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
    user_email TEXT,
    status TEXT DEFAULT 'pending', -- pending, paid, printing, shipped
    price REAL,
    tracking_no TEXT,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES Orders(id),
    FOREIGN KEY (session_id) REFERENCES Sessions(id)
);
