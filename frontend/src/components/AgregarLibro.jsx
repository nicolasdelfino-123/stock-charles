import React, { useState, useEffect, useRef } from "react";
import { useAppContext } from "../context/appContext";
import { useNavigate } from "react-router-dom";

const AgregarLibro = () => {
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
  const isbnInputRef = useRef(null);

  // Estados para el autocompletado de editoriales
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [editorialesFiltradas, setEditorialesFiltradas] = useState([]);
  const editorialInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [indiceSeleccionado, setIndiceSeleccionado] = useState(-1);

  const stockInputRef = useRef(null);
  const modalActivoRef = useRef(false);

  const mensaje = store.mensaje;

  // Función para mover al siguiente campo
  const moveToNextField = (currentTarget) => {
    const form = currentTarget.form;
    const index = Array.prototype.indexOf.call(form, currentTarget);
    if (form.elements[index + 1]) {
      form.elements[index + 1].focus();
    }
  };

  // Función general para manejar Enter en los campos
  const handleInputKeyDown = (e) => {
    // Si el modal está activo, bloqueamos cualquier acción con Enter
    if (modalActivoRef.current && e.key === "Enter") {
      e.preventDefault();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();

      const fieldName = e.target.name;

      // Casos especiales por campo
      switch (fieldName) {
        case "isbn":
          // Para ISBN, si hay contenido y no se han cargado datos, disparar búsqueda
          if (formData.isbn && !datosCargados && !sinIsbn) {
            handleAutocomplete();
          } else {
            // Si ya se cargaron datos o no hay ISBN, mover al siguiente campo
            moveToNextField(e.target);
          }
          break;

        case "editorial":
          // Si hay una selección en el dropdown, aplicarla
          if (mostrarDropdown && indiceSeleccionado >= 0) {
            const seleccion = editorialesFiltradas[indiceSeleccionado];
            handleEditorialSelect(seleccion);
            setIndiceSeleccionado(-1);
            if (stockInputRef.current) {
              stockInputRef.current.focus();
            }
          } else {
            // Si no hay selección, mover al siguiente campo
            moveToNextField(e.target);
          }
          break;

        default:
          // Para todos los demás campos, mover al siguiente
          moveToNextField(e.target);
          break;
      }
    }
  };

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

  // Función para hacer scroll automático en el dropdown
  const scrollToSelectedItem = (index) => {
    if (dropdownRef.current) {
      const dropdown = dropdownRef.current;
      const selectedItem = dropdown.children[index];
      if (selectedItem) {
        const dropdownRect = dropdown.getBoundingClientRect();
        const itemRect = selectedItem.getBoundingClientRect();

        if (itemRect.bottom > dropdownRect.bottom) {
          dropdown.scrollTop += itemRect.bottom - dropdownRect.bottom;
        } else if (itemRect.top < dropdownRect.top) {
          dropdown.scrollTop -= dropdownRect.top - itemRect.top;
        }
      }
    }
  };

  // Manejar teclas en el input de editorial
  const handleEditorialKeyDown = (e) => {
    if (!mostrarDropdown || editorialesFiltradas.length === 0) {
      // Si no hay dropdown activo, usar la función general
      handleInputKeyDown(e);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = indiceSeleccionado < editorialesFiltradas.length - 1 ? indiceSeleccionado + 1 : 0;
      setIndiceSeleccionado(newIndex);
      scrollToSelectedItem(newIndex);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = indiceSeleccionado > 0 ? indiceSeleccionado - 1 : editorialesFiltradas.length - 1;
      setIndiceSeleccionado(newIndex);
      scrollToSelectedItem(newIndex);
    } else if (e.key === "Enter") {
      // Usar la función general que ya maneja el caso de editorial
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
        setSinIsbn(false);
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

  // Función de autocompletado
  const handleAutocomplete = async () => {
    const { isbn } = formData;

    if (!isbn) return;

    setIsLoading(true);
    setOrigen("");

    actions.setMensaje("🔍 Buscando datos del libro...");

    try {
      const libro = await actions.buscarLibroPorISBN(isbn);

      if (libro) {
        setFormData({
          ...formData,
          titulo: libro.titulo || "",
          autor: libro.autor || "",
          editorial: libro.editorial || "",
          stock: libro.stock || 1,
          precio: libro.precio || 0,
          ubicacion: libro.ubicacion || "",
        });

        const origenDetectado = libro.fuente === "Google Books" ? "externo" : "local";
        setOrigen(origenDetectado);
        setDatosCargados(true);

        if (origenDetectado === "externo") {
          actions.setMensaje("✅ Datos obtenidos de Google Books. Puede editar si es necesario.");
        } else {
          actions.setMensaje("");
          // Enfocar el campo título después de cargar datos locales
          setTimeout(() => {
            document.getElementById("titulo")?.focus();
          }, 100);
        }
      } else {
        actions.setMensaje("✅ No se encontró información para este ISBN. Puede ingresar los datos manualmente.");
        setOrigen("");
        setDatosCargados(false);
        limpiarDatosLibro(isbn);
        // Enfocar el campo título cuando no se encuentran datos
        setTimeout(() => {
          document.getElementById("titulo")?.focus();
        }, 100);
      }
    } catch (error) {
      console.error("❌ Error al autocompletar los datos:", error);
      actions.setMensaje("❌ Hubo un error al buscar información del libro.");
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminar handleIsbnBlur ya que ahora la búsqueda se dispara con Enter
  // const handleIsbnBlur = () => {
  //   if (formData.isbn && !datosCargados && !sinIsbn) {
  //     handleAutocomplete();
  //   }
  // };

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
      // Primero verificamos si el libro existe en NUESTRA base de datos
      let libroExistente = null;
      try {
        const resultadoBusqueda = await actions.buscarLibroPorISBN(formData.isbn);
        // Solo consideramos que existe si viene de nuestra BD local
        if (resultadoBusqueda && resultadoBusqueda.fuente === "Base de datos local") {
          libroExistente = resultadoBusqueda;
        }
      } catch (error) {
        console.log("No se encontró el libro en BD local, continuamos con creación");
      }

      if (libroExistente) {
        // Lógica de actualización
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
            const mensajeExito = `✅ Libro actualizado con éxito. Campos modificados: ${cambios.join(", ")}.`;
            actions.setMensaje(mensajeExito);
            setOrigen("local");

            if (formData.editorial) {
              actions.obtenerEditoriales();
            }
          } else {
            alert(resultado.error || "Hubo un error al actualizar el libro");
          }
        } else {
          actions.setMensaje("✅ No se realizaron cambios en el libro.");
          setTimeout(() => actions.setMensaje(""), 10000);
        }
      } else {
        // Creación de nuevo libro
        const resultado = await actions.crearLibro(formData);

        if (resultado.success) {
          actions.setMensaje(
            `✅ Libro creado con éxito con stock de ${formData.stock} unidad(es).`
          );

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
      alert("Hubo un error con la solicitud: " + (error.message || "Intente nuevamente"));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mensaje && e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        actions.setMensaje("");

        setTimeout(() => {
          modalActivoRef.current = false;
        }, 100);
      }
    };

    if (mensaje) {
      modalActivoRef.current = true;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mensaje]);

  const fondoURL = "/fondo-3.jpg"

  return (
    <>
      {mensaje && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: "300px"
          }}
        >
          <div
            className="alert alert-success"
            role="alert"
            style={{
              maxWidth: "500px",
              width: "90%",
              borderRadius: "12px",
              padding: "25px 30px",
              fontSize: "1.1rem",
              fontWeight: "600",
              backgroundColor: "#d4edda",
              color: "#155724",
              border: "1px solid #c3e6cb",
              boxShadow: "0 10px 20px rgba(0,0,0,0.25)",
              textAlign: "center"
            }}
          >
            <div style={{ marginBottom: mensaje.startsWith("🔍") ? "0" : "20px" }}>
              {mensaje}
            </div>
            {!mensaje.startsWith("🔍") && (
              <button
                type="button"
                className="btn btn-success"
                style={{
                  borderRadius: "8px",
                  fontWeight: "700",
                  padding: "10px 20px",
                  fontSize: "1rem",
                  backgroundColor: "#28a745",
                  border: "none"
                }}
                onClick={() => actions.setMensaje("")}
              >
                Ok
              </button>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${fondoURL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: "100vh",
          paddingTop: "10px",
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
                    autoFocus
                    required
                    ref={isbnInputRef}
                    onKeyDown={handleInputKeyDown}
                    readOnly={sinIsbn}
                    placeholder={
                      sinIsbn
                        ? "Se generará automáticamente..."
                        : "Ingrese el ISBN y presione Enter"
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
                      border: "2px solid #b0bec5",
                      borderRadius: "4px",
                      accentColor: "#4caf50",
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
                  : "Ingrese el ISBN y presione Enter para buscar automáticamente"}
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
                    autoComplete="off"
                    name="editorial"
                    value={formData.editorial}
                    onChange={handleChange}
                    placeholder="Ingrese la editorial"
                    onKeyDown={handleEditorialKeyDown}
                    onFocus={() => {
                      if (formData.editorial.trim() !== "" && editorialesFiltradas.length > 0) {
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
                            backgroundColor: index === indiceSeleccionado ? "#9bc29c" : "#fff",
                            transition: "background-color 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (index !== indiceSeleccionado) {
                              e.target.style.backgroundColor = "#f5f5f5";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (index !== indiceSeleccionado) {
                              e.target.style.backgroundColor = "#fff";
                            }
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
                  ref={stockInputRef}
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
                // Añade estos estilos para cuando el botón tiene foco
                onFocus={(e) => {
                  e.target.style.border = "3px solid #1b4d1b"; // Borde verde oscuro al recibir foco
                  e.target.style.boxShadow = "0 0 0 3px rgba(46, 125, 50, 0.5)"; // Sombra para mayor énfasis
                }}
                onBlur={(e) => {
                  e.target.style.border = "3px solid transparent"; // Vuelve al estado normal al perder foco
                  e.target.style.boxShadow = "0 6px 12px rgba(106, 170, 106, 0.5)";
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "linear-gradient(135deg, #6aaa6a 0%, #4d8b4d 100%)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "linear-gradient(135deg, #a8d5a8 0%, #6aaa6a 100%)";
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
    </>
  );


};

export default AgregarLibro;