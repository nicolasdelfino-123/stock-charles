from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Integer, String, Float

class Base(DeclarativeBase):
    pass

class Libro(Base):
    __tablename__ = "libros"
    __table_args__ = {'schema': 'stock_charles_schema'}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    autor: Mapped[str] = mapped_column(String(100), nullable=False)
    editorial: Mapped[str] = mapped_column(String(100), nullable=True)
    isbn: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    precio: Mapped[float] = mapped_column(Float)
    ubicacion: Mapped[str] = mapped_column(String(40), nullable=False)

    def __repr__(self):
        return f"<Libro {self.titulo}>"
