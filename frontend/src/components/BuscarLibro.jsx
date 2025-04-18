import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const BuscarLibro = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    isbn: "",
    titulo: "",
    autor: "",
    ubicacion: "",
    stock: "",
    editorial: "",
  });
  const [resultados, setResultados] = useState([]);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSearch = async () => {
    if (!formData.isbn) return;

    try {
      const response = await fetch("http://127.0.0.1:5000/libros");

      if (!response.ok) throw new Error("No se pudo obtener la lista");

      const libros = await response.json();

      const libroEncontrado = libros.find(
        (libro) => libro.isbn === formData.isbn
      );

      if (libroEncontrado) {
        setFormData({
          ...formData,
          id: libroEncontrado.id,
          titulo: libroEncontrado.titulo,
          autor: libroEncontrado.autor,
          stock: libroEncontrado.stock,
          ubicacion: libroEncontrado.ubicacion || "",
          editorial: libroEncontrado.editorial || "",
        });
        setError("");
      } else {
        setError("No se encontró un libro con ese ISBN");
      }
    } catch (err) {
      console.error("Error al buscar el libro:", err);
      setError("Error al buscar el libro.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/libros");
      const libros = await response.json();

      if (response.ok) {
        // Filtro por coincidencia parcial en el título
        const filtro = formData.titulo.toLowerCase();
        const librosFiltrados = libros.filter((libro) =>
          libro.titulo.toLowerCase().includes(filtro)
        );

        if (librosFiltrados.length === 0) {
          setError("No se encontraron coincidencias por título.");
        } else {
          setError("");
        }

        setResultados(librosFiltrados);
      } else {
        alert("Error al buscar libros");
      }
    } catch (error) {
      console.error("Error en la búsqueda:", error);
      alert("Hubo un error: " + error.message);
    }
  };

  const limpiarPantalla = () => {
    setFormData({
      isbn: "",
      titulo: "",
      autor: "",
      ubicacion: "",
      stock: "",
      editorial: "",
    });
    setResultados([]);
    setError("");
  };

  // Función para seleccionar un libro de los resultados
  const handleSelectBook = (libro) => {
    setFormData({
      ...formData,
      isbn: libro.isbn,
      titulo: libro.titulo,
      autor: libro.autor,
      ubicacion: libro.ubicacion || "",
      stock: libro.stock,
      editorial: libro.editorial || "",
    });
    setResultados([]); // Limpiar resultados después de seleccionar
  };

  return (
    <div className="container mt-5">
      <div className="card shadow-lg p-4">
        <h2 className="mb-4 text-center">Buscar Libro</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">ISBN:</label>
            <input
              type="text"
              className="form-control"
              name="isbn"
              value={formData.isbn}
              onChange={handleChange}
              onBlur={handleSearch}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">
              Título (buscar por palabra clave):
            </label>
            <input
              type="text"
              className="form-control"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              placeholder="Ej: princip"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Autor:</label>
            <input
              type="text"
              className="form-control"
              name="autor"
              value={formData.autor}
              onChange={handleChange}
              readOnly
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Ubicación:</label>
            <input
              type="text"
              className="form-control"
              name="ubicacion"
              value={formData.ubicacion}
              onChange={handleChange}
              readOnly
            />
          </div>
          <div className="mb-3">
            <label htmlFor="stock" className="form-label">
              Stock:
            </label>
            <input
              type="text"
              className="form-control"
              id="stock"
              name="stock"
              value={formData.stock}
              readOnly
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Editorial:</label>
            <input
              type="text"
              className="form-control"
              name="editorial"
              value={formData.editorial}
              onChange={handleChange}
              readOnly
            />
          </div>

          <div className="d-flex justify-content-between">
            <button type="submit" className="btn btn-primary">
              Buscar
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate("/")}
            >
              Volver al Inicio
            </button>
          </div>
        </form>

        <div className="d-flex justify-content-center mt-3">
          <button
            type="button"
            className="btn btn-danger"
            onClick={limpiarPantalla}
          >
            Limpiar Pantalla
          </button>
        </div>

        {resultados.length > 0 && (
          <div className="mt-4">
            <h4>Resultados:</h4>
            <ul className="list-group">
              {resultados.map((libro, index) => (
                <li key={index} className="list-group-item">
                  <strong>Título:</strong> {libro.titulo} <br />
                  <strong>Autor:</strong> {libro.autor} <br />
                  <strong>Ubicación:</strong>{" "}
                  {libro.ubicacion || "No disponible"} <br />
                  <strong>Stock:</strong> {libro.stock} <br />
                  <strong>Editorial:</strong>{" "}
                  {libro.editorial || "No disponible"} <br />
                  {/* Botón para seleccionar el libro */}
                  <button
                    className="btn btn-success mt-2"
                    onClick={() => handleSelectBook(libro)}
                  >
                    Seleccionar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {error && <div className="mt-4 text-danger">{error}</div>}
      </div>
    </div>
  );
};

export default BuscarLibro;
