from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import Config
from models.libro import Base

# Crear el motor de base de datos utilizando la URI definida en el archivo config.py
def get_engine():
    return create_engine(Config.SQLALCHEMY_DATABASE_URI, echo=True)

# Crear la sesión de la base de datos
Session = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())

# Función para crear las tablas
def init_db():
    # Crear todas las tablas en la base de datos
    Base.metadata.create_all(bind=get_engine())
