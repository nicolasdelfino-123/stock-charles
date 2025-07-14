import React, { useState, useEffect, useRef } from "react";
import { useAppContext } from "../context/appContext";
import { useNavigate } from "react-router-dom";

const AgregarLibro = () => {
  // Evita submit con Enter y mueve al siguiente input
  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && e.target.name !== "isbn") {
      e.preventDefault();
      const form = e.target.form;
      const index = Array.prototype.indexOf.call(form, e.target);
      if (form.elements[index + 1]) {
        form.elements[index + 1].focus();
      }
    }
  };

  const { store, actions } = useAppContext();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    isbn: "",
    titulo: "",
    autor: "",
    editorial: "",
    stock: 1,
    precio: 0,
    ubicacion: "",
  });

  const [sinIsbn, setSinIsbn] = useState(false);
  const [isbnGenerado, setIsbnGenerado] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [datosCargados, setDatosCargados] = useState(false);
  const [origen, setOrigen] = useState("");
  const [generandoIsbn, setGenerandoIsbn] = useState(false);

  // Estados para el autocompletado de editoriales
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [editorialesFiltradas, setEditorialesFiltradas] = useState([]);
  const editorialInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const mensaje = store.mensaje;

  // Cargar editoriales al montar el componente
  useEffect(() => {
    actions.obtenerEditoriales();
  }, []);

  // Filtrar editoriales cuando cambia el input o las editoriales disponibles
  useEffect(() => {
    if (formData.editorial && store.editoriales) {
      const filtradas = store.editoriales.filter(editorial =>
        editorial.toLowerCase().includes(formData.editorial.toLowerCase())
      );
      setEditorialesFiltradas(filtradas);
    } else {
      setEditorialesFiltradas([]);
    }
  }, [formData.editorial, store.editoriales]);

  // Cerrar dropdown cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        editorialInputRef.current && !editorialInputRef.current.contains(event.target)) {
        setMostrarDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Función para limpiar los datos del libro excepto el ISBN
  const limpiarDatosLibro = (isbnValue = formData.isbn) => {
    setFormData({
      isbn: isbnValue,
      titulo: "",
      autor: "",
      editorial: "",
      stock: 1,
      precio: 0,
      ubicacion: "",
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Si cambiamos manualmente el ISBN, reiniciamos el estado
    if (name === "isbn") {
      setOrigen("");
      setDatosCargados(false);
      limpiarDatosLibro(value);
    }

    // Si estamos escribiendo en editorial, mostrar dropdown
    if (name === "editorial") {
      setMostrarDropdown(true);
    }

    actions.setMensaje("");
  };

  // Manejar selección de editorial del dropdown
  const handleEditorialSelect = (editorial) => {
    setFormData({
      ...formData,
      editorial: editorial
    });
    setMostrarDropdown(false);
    editorialInputRef.current.focus();
  };

  // Manejar teclas en el input de editorial
  const handleEditorialKeyDown = (e) => {
    if (e.key === "ArrowDown" && editorialesFiltradas.length > 0) {
      e.preventDefault();
      setMostrarDropdown(true);
    } else if (e.key === "Escape") {
      setMostrarDropdown(false);
    } else {
      handleInputKeyDown(e);
    }
  };

  // Función mejorada para generar ISBN automáticamente
  const generarYMostrarIsbn = async () => {
    try {
      setGenerandoIsbn(true);
      actions.setMensaje("Generando ISBN automáticamente...");

      const resultado = await actions.generarIsbnAutomatico();

      if (resultado.success) {
        setIsbnGenerado(resultado.isbn);
        setFormData({
          ...formData,
          isbn: resultado.isbn,
        });
        actions.setMensaje(`✅ ISBN generado automáticamente: ${resultado.isbn}`);
        setOrigen("servidor");
      } else {
        actions.setMensaje(`❌ ${resultado.error}`);
        setOrigen("");
        setSinIsbn(false); // Desactiva el checkbox si falla
        setFormData({
          ...formData,
          isbn: "",
        });
      }
    } catch (error) {
      console.error("Error al generar ISBN:", error);
      actions.setMensaje("❌ Error inesperado al generar ISBN.");
      setOrigen("");
      setSinIsbn(false);
    } finally {
      setGenerandoIsbn(false);
    }
  };

  const handleAutocomplete = async () => {
    const { isbn } = formData;

    if (!isbn) return;

    setIsLoading(true);
    setOrigen("");

    try {
      // Primero buscamos en nuestra base de datos local
      const libroLocal = await actions.buscarLibroPorISBN(isbn);

      if (libroLocal) {
        setFormData({
          ...formData,
          autor: libroLocal.autor || "",
          editorial: libroLocal.editorial || "",
          stock: libroLocal.stock || 1,
          precio: libroLocal.precio || 0,
          titulo: libroLocal.titulo || "",
          ubicacion: libroLocal.ubicacion || "",
        });
        setOrigen("local");
        setDatosCargados(true);
      } else {
        // Si no lo encontramos localmente, buscamos en las fuentes externas
        const libroExterno = await actions.buscarLibroExterno(isbn);

        if (libroExterno) {
          setFormData({
            ...formData,
            titulo: libroExterno.titulo || "",
            autor: libroExterno.autor || "",
            editorial: libroExterno.editorial || "",
          });
          setOrigen("externo");
          setDatosCargados(true);
          actions.setMensaje(
            `Datos obtenidos de ${libroExterno.fuente || "fuente externa"}. Puede editar si es necesario.`
          );
        } else {
          actions.setMensaje(
            "No se encontró información para este ISBN. Puede ingresar los datos manualmente."
          );
          setOrigen("");
          setDatosCargados(false);
          limpiarDatosLibro(isbn);
        }
      }
    } catch (error) {
      console.error("Error al autocompletar los datos:", error);
      actions.setMensaje("Hubo un error al buscar información del libro.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIsbnBlur = () => {
    if (formData.isbn && !datosCargados && !sinIsbn) {
      handleAutocomplete();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { isbn, titulo, autor, ubicacion, stock } = formData;

    if (!isbn || !titulo || !autor || !ubicacion) {
      alert("Por favor, complete los campos obligatorios: ISBN, título, autor y ubicación.");
      return;
    }

    if (stock < 1) {
      alert("El stock debe ser al menos 1.");
      return;
    }

    if (formData.precio < 0) {
      alert("El precio no puede ser negativo.");
      return;
    }

    try {
      const libroExistente = await actions.buscarLibroPorISBN(formData.isbn);

      if (libroExistente) {
        let cambios = [];

        if (formData.titulo !== libroExistente.titulo) {
          cambios.push("título");
        }
        if (formData.autor !== libroExistente.autor) {
          cambios.push("autor");
        }
        if (formData.editorial !== libroExistente.editorial) {
          cambios.push("editorial");
        }
        if (parseInt(formData.stock) !== parseInt(libroExistente.stock)) {
          cambios.push(`stock (${libroExistente.stock} → ${formData.stock})`);
        }
        if (parseFloat(formData.precio) !== parseFloat(libroExistente.precio)) {
          cambios.push("precio");
        }
        if (formData.ubicacion !== libroExistente.ubicacion) {
          cambios.push("ubicación");
        }

        if (cambios.length > 0) {
          const resultado = await actions.actualizarLibro(
            libroExistente.id,
            formData
          );

          if (resultado.success) {
            const mensajeExito = `Libro actualizado con éxito. Campos modificados: ${cambios.join(", ")}.`;
            actions.setMensaje(mensajeExito);

            // Borrar mensaje luego de 5 segundos
            setTimeout(() => {
              actions.setMensaje("");
            }, 10000);

            setOrigen("local");

            // Actualizar editoriales después de guardar
            if (formData.editorial) {
              actions.obtenerEditoriales();
            }
          } else {
            alert(resultado.error || "Hubo un error al actualizar el libro");
          }
        } else {
          actions.setMensaje("No se realizaron cambios en el libro.");

          // Borrar mensaje luego de 5 segundos
          setTimeout(() => {
            actions.setMensaje("");
          }, 10000);
        }
      } else {
        const resultado = await actions.crearLibro(formData);

        if (resultado.success) {
          actions.setMensaje(
            `Libro creado con éxito con stock de ${formData.stock} unidad(es).`
          );

          // Borrar mensaje luego de 5 segundos
          setTimeout(() => {
            actions.setMensaje("");
          }, 10000);

          // Actualizar editoriales después de crear
          if (formData.editorial) {
            actions.obtenerEditoriales();
          }

          // Resetear formulario
          setFormData({
            isbn: "",
            titulo: "",
            autor: "",
            editorial: "",
            stock: 1,
            precio: 0,
            ubicacion: "",
          });
          setOrigen("");
          setDatosCargados(false);
          setSinIsbn(false);
          setIsbnGenerado("");
        } else {
          alert(resultado.error || "Hubo un error al crear el libro");
        }
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
      alert("Hubo un error con la solicitud: " + error.message);
    }
  };

  const fondoURL = "/fondo-3.jpg"

  return (
    <div
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${fondoURL})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        paddingTop: "10px", // rompe el colapso del margin
        boxSizing: "border-box",
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: "800px",
          backgroundColor: "#d7f0d7",
          borderRadius: "12px",
          boxShadow: "0 8px 20px rgba(0, 100, 0, 0.1)",
          padding: "30px 25px",
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}
      >
        {/* Título y botón */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            marginBottom: "25px",
            height: "40px",
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/")}
            style={{
              borderRadius: "8px",
              fontWeight: "600",
              padding: "10px 20px",
              boxShadow: "0 4px 8px rgba(0, 100, 0, 0.1)",
              transition: "background-color 0.3s ease",
              zIndex: 2,
            }}
          >
            Volver al Inicio
          </button>

          <h2
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              color: "#183d1b",
              fontWeight: "700",
              margin: 0,
              fontSize: "1.8rem",
              userSelect: "none",
              zIndex: 1,
            }}
          >
            Agregar Libro
          </h2>

          <div style={{ width: "130px" }}></div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ISBN + checkbox */}
          <div className="mb-3">
            <label htmlFor="isbn" className="form-label" style={{ color: "black", fontWeight: "600" }}>
              ISBN:
            </label>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ flexGrow: 1 }}>
                <input
                  type="text"
                  id="isbn"
                  name="isbn"
                  value={formData.isbn}
                  onChange={handleChange}
                  onBlur={handleIsbnBlur}
                  autoFocus
                  required
                  onKeyDown={handleInputKeyDown}
                  readOnly={sinIsbn}
                  placeholder={
                    sinIsbn
                      ? "Se generará automáticamente..."
                      : "Ingrese el ISBN"
                  }
                  style={{
                    width: "100%",
                    padding: "10px 15px",
                    borderRadius: "8px",
                    border: "1.5px solid #2e7d32",
                    backgroundColor: sinIsbn ? "#d7f0d7" : "#e8f5e9",
                    color: "black",
                    fontWeight: "500",
                    fontSize: "1rem",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "10px" }}>
                <input
                  style={{
                    width: "20px",
                    height: "20px",
                    border: "2px solid #b0bec5", // borde pastel
                    borderRadius: "4px",
                    accentColor: "#4caf50", // ✅ color del tilde
                  }}
                  type="checkbox"
                  id="crearSinIsbn"
                  className="form-check-input"
                  checked={sinIsbn}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    if (checked) {
                      await generarYMostrarIsbn();
                      setSinIsbn(true);
                      setDatosCargados(false);
                    } else {
                      setFormData({ ...formData, isbn: "" });
                      setIsbnGenerado("");
                      setOrigen("");
                      setDatosCargados(false);
                      setSinIsbn(false);
                      actions.setMensaje("");
                    }
                  }}
                  disabled={generandoIsbn}
                />
                <label htmlFor="crearSinIsbn" className="form-check-label small" style={{ color: "black" }}>
                  Crear sin ISBN
                </label>
                {generandoIsbn && (
                  <span style={{ marginLeft: "8px" }}>
                    <div className="spinner-border spinner-border-sm" role="status" style={{ color: "#2e7d32" }}>
                      <span className="visually-hidden">Generando...</span>
                    </div>
                  </span>
                )}
              </div>
            </div>

            <small
              className="text-muted"
              style={{ color: "#4a7f4a", display: "block", marginTop: "5px" }}
            >
              {sinIsbn
                ? "ISBN generado automáticamente. Se asignará el próximo número disponible."
                : ""}
            </small>
          </div>

          {/* CAMPOS */}
          <div className="row">
            {/* Título */}
            <div className="mb-3 col-12">
              <label htmlFor="titulo" className="form-label" style={{ color: "black", fontWeight: "600" }}>
                Título:
              </label>
              <input
                type="text"
                id="titulo"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                required
                placeholder="Ingrese el título del libro"
                onKeyDown={handleInputKeyDown}
                style={{
                  width: "100%",
                  padding: "10px 15px",
                  borderRadius: "8px",
                  border: "1.5px solid #2e7d32",
                  backgroundColor: "#e8f5e9",
                  color: "black",
                  fontWeight: "500",
                  fontSize: "1rem",
                  boxShadow: "inset 1px 1px 3px rgba(46, 125, 50, 0.15)",
                  transition: "border-color 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#1b4d1b";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#2e7d32";
                }}
              />
            </div>

            {/* Autor */}
            <div className="mb-3 col-12">
              <label htmlFor="autor" className="form-label" style={{ color: "black", fontWeight: "600" }}>
                Autor:
              </label>
              <input
                type="text"
                id="autor"
                name="autor"
                value={formData.autor}
                onChange={handleChange}
                required
                placeholder="Ingrese el autor"
                onKeyDown={handleInputKeyDown}
                style={{
                  width: "100%",
                  padding: "10px 15px",
                  borderRadius: "8px",
                  border: "1.5px solid #2e7d32",
                  backgroundColor: "#e8f5e9",
                  color: "black",
                  fontWeight: "500",
                  fontSize: "1rem",
                  boxShadow: "inset 1px 1px 3px rgba(46, 125, 50, 0.15)",
                  transition: "border-color 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#1b4d1b";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#2e7d32";
                }}
              />
            </div>

            {/* Editorial con dropdown */}
            <div className="mb-3 col-12">
              <label htmlFor="editorial" className="form-label" style={{ color: "black", fontWeight: "600" }}>
                Editorial:
              </label>
              <div style={{ position: "relative" }}>
                <input
                  ref={editorialInputRef}
                  type="text"
                  id="editorial"
                  name="editorial"
                  value={formData.editorial}
                  onChange={handleChange}
                  placeholder="Ingrese la editorial"
                  onKeyDown={handleEditorialKeyDown}
                  onFocus={() => {
                    if (editorialesFiltradas.length > 0) {
                      setMostrarDropdown(true);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 15px",
                    borderRadius: "8px",
                    border: "1.5px solid #2e7d32",
                    backgroundColor: "#e8f5e9",
                    color: "black",
                    fontWeight: "500",
                    fontSize: "1rem",
                    boxShadow: "inset 1px 1px 3px rgba(46, 125, 50, 0.15)",
                    transition: "border-color 0.3s ease",
                  }}
                />

                {/* Dropdown de editoriales */}
                {mostrarDropdown && editorialesFiltradas.length > 0 && (
                  <div
                    ref={dropdownRef}
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      backgroundColor: "#fff",
                      border: "1px solid #2e7d32",
                      borderRadius: "8px",
                      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                      zIndex: 1000,
                      maxHeight: "150px",
                      overflowY: "auto",
                    }}
                  >
                    {editorialesFiltradas.map((editorial, index) => (
                      <div
                        key={index}
                        onClick={() => handleEditorialSelect(editorial)}
                        style={{
                          padding: "8px 15px",
                          cursor: "pointer",
                          borderBottom: index < editorialesFiltradas.length - 1 ? "1px solid #eee" : "none",
                          fontSize: "1rem",
                          color: "black",
                          backgroundColor: "#fff",
                          transition: "background-color 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#f5f5f5";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "#fff";
                        }}
                      >
                        {editorial}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stock */}
            <div className="mb-3 col-6">
              <label htmlFor="stock" className="form-label" style={{ color: "black", fontWeight: "600" }}>
                Stock (mínimo 1):
              </label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                placeholder="Ingrese la cantidad en stock"
                min="1"
                onKeyDown={handleInputKeyDown}
                style={{
                  width: "100%",
                  padding: "10px 15px",
                  borderRadius: "8px",
                  border: "1.5px solid #2e7d32",
                  backgroundColor: "#e8f5e9",
                  color: "black",
                  fontWeight: "500",
                  fontSize: "1rem",
                  boxShadow: "inset 1px 1px 3px rgba(46, 125, 50, 0.15)",
                  transition: "border-color 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#1b4d1b";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#2e7d32";
                }}
              />
            </div>

            {/* Precio */}
            <div className="mb-3 col-6">
              <label htmlFor="precio" className="form-label" style={{ color: "black", fontWeight: "600" }}>
                Precio:
              </label>
              <input
                type="number"
                id="precio"
                name="precio"
                value={formData.precio}
                onChange={handleChange}
                placeholder="Ingrese el precio"
                onKeyDown={handleInputKeyDown}
                style={{
                  width: "100%",
                  padding: "10px 15px",
                  borderRadius: "8px",
                  border: "1.5px solid #2e7d32",
                  backgroundColor: "#e8f5e9",
                  color: "black",
                  fontWeight: "500",
                  fontSize: "1rem",
                  boxShadow: "inset 1px 1px 3px rgba(46, 125, 50, 0.15)",
                  transition: "border-color 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#1b4d1b";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#2e7d32";
                }}
              />
            </div>

            {/* Ubicación */}
            <div className="mb-3 col-12">
              <label htmlFor="ubicacion" className="form-label" style={{ color: "black", fontWeight: "600" }}>
                Ubicación:
              </label>
              <input
                type="text"
                id="ubicacion"
                name="ubicacion"
                value={formData.ubicacion}
                onChange={handleChange}
                placeholder="Ingrese la ubicación"
                onKeyDown={handleInputKeyDown}
                style={{
                  width: "100%",
                  padding: "10px 15px",
                  borderRadius: "8px",
                  border: "1.5px solid #2e7d32",
                  backgroundColor: "#e8f5e9",
                  color: "black",
                  fontWeight: "500",
                  fontSize: "1rem",
                  boxShadow: "inset 1px 1px 3px rgba(46, 125, 50, 0.15)",
                  transition: "border-color 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#1b4d1b";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#2e7d32";
                }}
              />
            </div>
          </div>

          {/* Mensaje */}
          {mensaje && (
            <div className="mb-3" style={{ color: "#2e7d32", fontWeight: "700", fontSize: "1rem" }}>
              ℹ️ {mensaje}
            </div>
          )}

          {/* Botones */}
          <div className="d-flex gap-3 mb-3">
            <button
              type="submit"
              className="btn"
              style={{
                flex: 1,
                background: "linear-gradient(135deg, #a8d5a8 0%, #6aaa6a 100%)",
                color: "black",
                fontWeight: "700",
                fontSize: "1.25rem",
                padding: "12px 0",
                borderRadius: "10px",
                boxShadow: "0 6px 12px rgba(106, 170, 106, 0.5)",
                transition: "background 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "linear-gradient(135deg, #6aaa6a 0%, #4d8b4d 100%)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "linear-gradient(135deg, #a8d5a8 0%, #6aaa6a 100%)";
              }}
            >
              {formData.id ? "Actualizar Libro" : "Crear Libro"}
            </button>

            <button
              type="button"
              className="btn btn-warning"
              style={{
                flex: 1,
                fontWeight: "700",
                fontSize: "1.25rem",
                borderRadius: "10px",
                boxShadow: "0 6px 12px rgba(184,136,50,0.5)",
                transition: "background-color 0.3s ease",
                backgroundColor: "#fff933",
                color: "black",
              }}
              onClick={() => {
                setFormData({
                  isbn: "",
                  titulo: "",
                  autor: "",
                  editorial: "",
                  stock: 1,
                  precio: 0,
                  ubicacion: "",
                });
                setOrigen("");
                setDatosCargados(false);
                setSinIsbn(false);
                setIsbnGenerado("");
                actions.setMensaje("");
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#c26f3c")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#fff933")}
            >
              Refrescar
            </button>
          </div>

        </form>
      </div>
    </div>
  );


};

export default AgregarLibro;