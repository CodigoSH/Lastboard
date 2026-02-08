import sqlite3

try:
    conn = sqlite3.connect('dashboard.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"Users table columns: {columns}")
    
    if 'beta_updates' in columns:
        print("✅ Column 'beta_updates' exists.")
    else:
        print("❌ Column 'beta_updates' MISSING.")

    # Check value for a user if exists
    cursor.execute("SELECT username, beta_updates FROM users")
    rows = cursor.fetchall()
    for row in rows:
        print(f"User: {row[0]}, beta_updates: {row[1]}")

except Exception as e:
    print(f"Error: {e}")
finally:
    if conn:
        conn.close()
