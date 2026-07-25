from app.database import engine
from sqlalchemy import text

try:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT DATABASE();"))
        print("Connected Successfully!")
        print("Database:", result.scalar())

except Exception as e:
    print("Connection Failed!")
    print(e)