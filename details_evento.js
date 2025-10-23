// =============================================================================
// FUNCIONES UTILITARIAS
// =============================================================================

function convertirASoloFecha(fechaHora) {
    const fecha = new Date(fechaHora);
    return fecha.toISOString().split('T')[0];
}

function ensureRedemprendedoresPath(path) {
    let nombre_imagen = path.replace(/.*files\//, '');
    return `/redemprendedores/files/${nombre_imagen}`;
}

function ensurelocalredemprendedores(localPath) {
    let nombre_imagen = localPath.replace(/.*files\//, '');
    return `/redemprendedores/output/files/${nombre_imagen}`;
}

// Refactor: unificamos la conversión de rutas locales a URL públicas para DRY
function toPublicUrl(localPath) {
    if (!localPath) return './assets/images/placeholder.jpg';
    const baseUrl = window.location.origin;
    return baseUrl.includes('localhost') ? ensurelocalredemprendedores(localPath) : ensureRedemprendedoresPath(localPath);
}

// Compat: mantener nombre previo pero delegar
function convertLocalPathToUrl(localPath) { return toPublicUrl(localPath); }

// =============================================================================
// FUNCIÓN PARA CARGAR BANNER CON FOTOS DEL EVENTO
// =============================================================================

// Refactor: DRY para obtener imágenes del evento
function parseImageField(field) {
    const urls = [];
    if (!field) return urls;
    try {
        let data = field;
        if (typeof field === 'string') {
            if (/^https?:\/\//i.test(field)) return [field];
            try { data = JSON.parse(field); } catch (_) {}
        }
        if (Array.isArray(data)) {
            data.forEach(img => {
                if (img?.name) urls.push(convertLocalPathToUrl(img.name));
                else if (img?.url) urls.push(/^https?:\/\//i.test(img.url) ? img.url : convertLocalPathToUrl(img.url));
            });
        } else if (data && typeof data === 'object') {
            if (data.name) urls.push(convertLocalPathToUrl(data.name));
            else if (data.url) urls.push(/^https?:\/\//i.test(data.url) ? data.url : convertLocalPathToUrl(data.url));
        } else if (typeof data === 'string') {
            urls.push(convertLocalPathToUrl(data));
        }
    } catch (e) {
        console.error('parseImageField error:', e, field);
    }
    return urls.filter(Boolean);
}

function getEventImages(evento) {
    const campos = ['imagen_principal', 'imagen_secundaria', 'imagen_ubicacion'];
    let urls = [];
    campos.forEach(c => urls.push(...parseImageField(evento?.[c])));
    if (Array.isArray(evento?.fotos)) {
        evento.fotos.forEach(fotoItem => {
            if (fotoItem?.url) urls.push(/^https?:\/\//i.test(fotoItem.url) ? fotoItem.url : convertLocalPathToUrl(fotoItem.url));
            else urls.push(...parseImageField(fotoItem?.foto));
        });
    }
    if (evento?.imagen) urls.unshift(convertLocalPathToUrl(evento.imagen));
    return urls.filter((u, i, arr) => u && arr.indexOf(u) === i);
}

function loadBannerConFotosEvento(evento) {
    const imagenes = getEventImages(evento);
    if (imagenes.length > 0) {
        createEventPhotoBanner(imagenes);
    } else {
        loadBannerDinamicoOriginal();
    }
}

// =============================================================================
// FUNCIÓN PARA CARGAR BANNER DINÁMICO ORIGINAL (FALLBACK)
// =============================================================================

function loadBannerDinamicoOriginal() {
    fetch('assets/components/eventos/getBannerEvento.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ubicacion: 'EVENTOS'
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            const data = JSON.parse(text);

            if (data.fotos && data.fotos[0]) {
                try {
                    const fotoData = JSON.parse(data.fotos[0].foto);
                    if (Array.isArray(fotoData) && fotoData[0] && fotoData[0].name) {
                        const bannerUrl = convertLocalPathToUrl(fotoData[0].name);

                        // Crear banner estático (una sola imagen, sin rotación)
                        createSingleImageBanner(bannerUrl);
                        return;
                    }
                } catch (e) {
                }
            }

            initializeBannerRotation();

        })
        .catch(error => {
            console.error('❌ Error al cargar banner dinámico original:', error);
            setTimeout(() => {
                initializeBannerRotation();
            }, 1000);
        });
}

function createSingleImageBanner(imageUrl) {
    const banner = document.getElementById('banner');
    const dotsContainer = document.getElementById('dots');
    const bannerLoading = document.getElementById('banner-loading');
    const bannerContent = document.getElementById('banner-content');

    // Limpiar dots (no necesarios para una sola imagen)
    dotsContainer.innerHTML = '';

    // Configurar el banner con la imagen
    banner.style.backgroundImage = `url(${imageUrl})`;
    banner.style.backgroundSize = 'cover';
    banner.style.backgroundPosition = 'center';

    // Ocultar loading y mostrar contenido
    setTimeout(() => {
        bannerLoading.style.display = 'none';
        bannerContent.style.display = 'block';
        bannerContent.classList.add('fade-in');
    }, 800);

    // No hay rotación para una sola imagen
    // Limpiar cualquier intervalo previo
    if (window.bannerRotationInterval) {
        clearInterval(window.bannerRotationInterval);
    }
}

function createEventPhotoBanner(imagenes) {
    const banner = document.getElementById('banner');
    const dotsContainer = document.getElementById('dots');
    const bannerLoading = document.getElementById('banner-loading');
    const bannerContent = document.getElementById('banner-content');

    let indice = 0;

    // Limpiar dots existentes
    dotsContainer.innerHTML = '';

    // Crear dots dinámicamente basado en las imágenes reales
    imagenes.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => cambiarImagenEvento(i));
        dotsContainer.appendChild(dot);
    });

    function actualizarDots() {
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === indice);
        });
    }

    function cambiarImagenEvento(nuevoIndice) {
        indice = nuevoIndice;
        banner.style.backgroundImage = `url('${imagenes[indice]}')`;
        actualizarDots();
    }

    function rotarImagenEvento() {
        indice = (indice + 1) % imagenes.length;
        banner.style.backgroundImage = `url('${imagenes[indice]}')`;
        actualizarDots();
    }

    // Configurar el banner con la primera imagen
    banner.style.backgroundImage = `url('${imagenes[0]}')`;
    banner.style.backgroundSize = 'cover';
    banner.style.backgroundPosition = 'center';

    // Ocultar loading y mostrar contenido
    setTimeout(() => {
        bannerLoading.style.display = 'none';
        bannerContent.style.display = 'block';
        bannerContent.classList.add('fade-in');
    }, 800);

    // Solo iniciar rotación si hay más de una imagen
    if (imagenes.length > 1) {
        window.bannerRotationInterval = setInterval(rotarImagenEvento, 5000);
    }

    // Almacenar referencia global para limpieza
    window.cambiarImagenEvento = cambiarImagenEvento;
}

// =============================================================================
// SISTEMA DE BANNER ESTÁTICO (FALLBACK)
// =============================================================================

function initializeBannerRotation() {
    const banner = document.getElementById('banner');
    const dotsContainer = document.getElementById('dots');
    const bannerLoading = document.getElementById('banner-loading');
    const bannerContent = document.getElementById('banner-content');

    const imagenes = [
        'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1495567720989-cebdbdd97913?auto=format&fit=crop&w=1600&q=80'
    ];

    let indice = 0;

    // Limpiar dots existentes
    dotsContainer.innerHTML = '';

    // Crear dots dinámicamente
    imagenes.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => cambiarImagen(i));
        dotsContainer.appendChild(dot);
    });

    function actualizarDots() {
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === indice);
        });
    }

    function cambiarImagen(nuevoIndice) {
        indice = nuevoIndice;
        banner.style.backgroundImage = `url('${imagenes[indice]}')`;
        actualizarDots();
    }

    function rotarImagen() {
        indice = (indice + 1) % imagenes.length;
        banner.style.backgroundImage = `url('${imagenes[indice]}')`;
        actualizarDots();
    }

    banner.style.backgroundImage = `url('${imagenes[0]}')`;

    setTimeout(() => {
        bannerLoading.style.display = 'none';
        bannerContent.style.display = 'block';
        bannerContent.classList.add('fade-in');
    }, 1200);

    window.bannerRotationInterval = setInterval(rotarImagen, 5000);
}

// =============================================================================
// CARGA DE DATOS DEL EVENTO (MODIFICADA)
// =============================================================================

const parametros = new URLSearchParams(window.location.search);
const id = parametros.get("id");

const mainContent = document.getElementById('main-content');

function cargarDetallesEvento() {
    fetch('assets/components/eventos/getDetailEvento.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id_evento: id
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(eventData => {
        const evento = eventData.eventos[0];

        // PRIMERO: Configurar el banner con las fotos del evento
        loadBannerConFotosEvento(evento);

        // SEGUNDO: Continuar con el resto del contenido
        mainContent.innerHTML = '';

        // Actualizar título del banner
        const bannerTitle = document.getElementById('evento-titulo-banner');
        const bannerDescription = document.getElementById('evento-descripcion-banner');

        if (bannerTitle && evento.nombre) {
            bannerTitle.textContent = evento.nombre;
        }

        if (bannerDescription && evento.fecha_inicio) {
            bannerDescription.innerHTML = `
                <svg class="detail-icon" fill="currentColor" viewBox="0 0 20 20" style="width: 16px; height: 16px; margin-right: 8px; vertical-align: middle;">
                    <path d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2h-1V1a1 1 0 00-2 0v1H9V1a1 1 0 00-2 0v1H6zM6 7h8v2H6V7zm0 4h8v2H6v-2z"/>
                </svg>
                ${formatearFecha(evento.fecha_inicio, evento.fecha_fin)}
            `;
        }

        // Crear estructura estilo Eventbrite MODIFICADA
        const eventStructure = document.createElement('div');
        eventStructure.className = 'event-container slide-up';

        eventStructure.innerHTML = `
            <div class="event-header-section">
                <h1 class="event-title-main">${evento.nombre}</h1>
                
                <!-- NUEVA: Descripción del evento directamente aquí -->
                <div class="event-description-header">
                    <p>${evento.descripcion}</p>
                </div>
            </div>

            <div class="event-content-grid">
                <div class="event-main-info">
                    <div class="event-details-grid">
                        <div class="detail-item">
                            <svg class="detail-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"/>
                            </svg>
                            <div class="detail-content">
                                <h4>Fecha</h4>
                                <p>${formatearFecha(evento.fecha_inicio, evento.fecha_fin)}</p>
                            </div>
                        </div>

                        <div class="detail-item">
                            <svg class="detail-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/>
                            </svg>
                            <div class="detail-content">
                                <h4>Hora</h4>
                                <p>${evento.fecha_fin && new Date(evento.fecha_inicio).toDateString() !== new Date(evento.fecha_fin).toDateString() 
                                    ? `${new Date(evento.fecha_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${new Date(evento.fecha_fin).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
                                    : new Date(evento.fecha_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>

                        <div class="detail-item">
                            <svg class="detail-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"/>
                            </svg>
                            <div class="detail-content">
                                <h4>Ubicación</h4>
                                <p>${evento.ubicacion}</p>
                            </div>
                        </div>

                        <div class="detail-item">
                            <svg class="detail-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <div class="detail-content">
                                <h4>Personas Registradas</h4>
                                <p>${evento.personas_registradas || 0} personas</p>
                            </div>
                        </div>
                    </div>

                    <div class="info-section">
                        <h2 class="section-title">Ubicación</h2>
                        <div class="map-container">
                            <iframe 
                                src="" 
                                allowfullscreen>
                            </iframe>
                        </div>
                    </div>

                    <!-- NUEVO: Botón de registro condicional -->
                    ${evento.requiere_preregistro === "si" ? `
                    <div class="register-section">
                        <button class="btn-register" id="registerButton" onclick="window.location.href='./RegistroEvento.php?id=${evento.id_evento}'">
                            <svg class="register-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"/>
                            </svg>
                            Registrarse al evento
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        mainContent.appendChild(eventStructure);

        // El resto del código continúa igual...
        createEventGallery(evento);
        createDynamicMap(evento);
        createTiendasGridSection(evento);

        // Cargar eventos relacionados
        setTimeout(() => {
            cargarEventosRelacionados(evento);
        }, 500);
    })
    .catch(error => {
        console.error('❌ Error al cargar los datos del evento:', error);
        mainContent.innerHTML = `
           <div class="error-message slide-up">
               <h3>Lo sentimos</h3>
               <p>Hubo un problema al cargar los datos del evento. Por favor intente nuevamente más tarde.</p>
               <button onclick="location.reload()">Intentar de nuevo</button>
           </div>
       `;
        initializeBannerRotation();
    });
}

// =============================================================================
// NUEVA FUNCIÓN DE GRID DE TIENDAS
// =============================================================================

function createTiendasGridSection(evento) {

    // Verificar si hay tiendas participantes
    if (!evento.tiendas_participantes || evento.tiendas_participantes.length === 0) {
        return;
    }

    // Crear sección de tiendas
    const tiendasSection = document.createElement('div');
    tiendasSection.className = 'info-section tiendas-grid-section';

    let tiendasHTML = `
        <h2 class="section-title">Tiendas Participantes</h2>
        <div class="tiendas-grid">
    `;

    // Generar HTML para cada tienda
    evento.tiendas_participantes.forEach(tienda => {
        // Determinar qué imagen usar según el tipo de tienda
        let tiendaLogo = tienda.logo || null;

        // Procesar la imagen si existe (puede venir como JSON o string)
        if (tiendaLogo) {
            try {
                // Si es un JSON string, parsearlo
                if (typeof tiendaLogo === 'string' && tiendaLogo.startsWith('[')) {
                    const imagenData = JSON.parse(tiendaLogo);
                    if (Array.isArray(imagenData) && imagenData[0] && imagenData[0].name) {
                        tiendaLogo = convertLocalPathToUrl(imagenData[0].name);
                    } else {
                        tiendaLogo = null;
                    }
                } else if (typeof tiendaLogo === 'string') {
                    // Si es una ruta directa
                    tiendaLogo = convertLocalPathToUrl(tiendaLogo);
                }
            } catch (e) {
                console.error('Error procesando imagen de tienda:', e);
                tiendaLogo = null;
            }
        }

        // Solo mostrar imagen si existe después del procesamiento
        const imagenHTML = tiendaLogo ? `
            <div class="tienda-grid-image-container">
                <img src="${tiendaLogo}" alt="${tienda.tienda_nombre}" class="tienda-grid-image" 
                     onerror="this.parentElement.style.display='none'">
            </div>
        ` : '';

        tiendasHTML += `
            <div class="tienda-grid-card">
                ${imagenHTML}
                <h3 class="tienda-grid-nombre">${tienda.tienda_nombre || 'Sin nombre'}</h3>
            </div>
        `;
    });

    tiendasHTML += `
        </div>
    `;

    tiendasSection.innerHTML = tiendasHTML;

    // Insertar en el DOM
    const eventMainInfo = document.querySelector('.event-main-info');
    const registerSection = eventMainInfo?.querySelector('.register-section');

    if (registerSection && eventMainInfo) {
        eventMainInfo.insertBefore(tiendasSection, registerSection);
    } else if (eventMainInfo) {
        eventMainInfo.appendChild(tiendasSection);
    }
}

// =============================================================================
// CARRUSEL DE EVENTOS RELACIONADOS (USANDO ESTILO DEL INDEX)
// =============================================================================

function cargarEventosRelacionados(eventoActual) {
    console.log('🔗 Cargando eventos relacionados para:', eventoActual.nombre);

    // Crear el contenedor para eventos relacionados
    const eventsSection = document.createElement('div');
    eventsSection.className = 'events-container events-carousel-container';
    eventsSection.innerHTML = `
        <h2 class="events-heading">
            Eventos que te pueden interesar
            <div class="carousel-navigation">
                <div class="nav-button prev" id="related-events-prev">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="currentColor" />
                    </svg>
                </div>
                <div class="nav-button next" id="related-events-next">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 6L8.59 7.41L13.17 12L8.59 16.59L10 18L16 12L10 6Z" fill="currentColor" />
                    </svg>
                </div>
            </div>
        </h2>
        <div class="cards-container" id="related-events-carousel">
            <div class="loading-indicator">
                <p>Cargando eventos...</p>
            </div>
        </div>
    `;

    // Insertar después del contenido principal
    const contentContainer = document.querySelector('.event-container');
    if (contentContainer && contentContainer.parentNode) {
        contentContainer.parentNode.insertBefore(eventsSection, contentContainer.nextSibling);
    }

    // Simular tiempo de carga y luego cargar eventos
    setTimeout(() => {
        fetch('assets/components/eventos/getMejoresEventos.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                estado: 'activo',
                limite: 8,
                direccion: 'DESC'
            })
        })
        .then(response => response.json())
        .then(data => {
            const cardsContainer = document.getElementById('related-events-carousel');
            cardsContainer.innerHTML = '';

            if (data.success && data.eventos && data.eventos.length > 0) {
                // Filtrar el evento actual
                const eventosRelacionados = data.eventos.filter(evento => evento.id_evento !== eventoActual.id_evento);

                eventosRelacionados.forEach((evento, index) => {
                    // Crear la tarjeta con animación escalonada
                    setTimeout(() => {
                        const eventItem = document.createElement('div');
                        eventItem.classList.add('event-item', 'carousel-event-item');

                        let imagenUrl = './assets/images/placeholder.jpg';
                        if (evento.imagen_principal) {
                            try {
                                const arr = JSON.parse(evento.imagen_principal);
                                if (Array.isArray(arr) && arr[0] && arr[0].name) {
                                    imagenUrl = convertLocalPathToUrl(arr[0].name);
                                }
                            } catch (e) {
                                imagenUrl = convertLocalPathToUrl(evento.imagen_principal);
                            }
                        }

                        const fechaTexto = formatearFecha(evento.fecha_inicio, evento.fecha_fin);
                        const estadoEvento = determinarEstadoEvento(evento);

                        eventItem.innerHTML = `
                            <div class="event-image">
                                <img src="${imagenUrl}" alt="${evento.nombre}">
                                ${estadoEvento ? `<div class="event-status">${estadoEvento}</div>` : ''}
                            </div>
                            <div class="event-details">
                                <h3 class="event-title">${evento.nombre}</h3>
                                <div class="event-date">${fechaTexto}</div>
                                <div class="event-price">${formatearPrecio(evento.precio_entrada, evento.es_gratuito)}</div>
                                <div class="event-location">${evento.nombre_municipio}, ${evento.departamento}</div>
                                <div class="event-remaining">${evento.personas_registradas} personas registradas</div>
                            </div>
                        `;

                        eventItem.addEventListener('click', function() {
                            incrementarVisitas(evento.id_evento);
                            window.location.href = `details_evento.php?id=${evento.id_evento}`;
                        });

                        cardsContainer.appendChild(eventItem);
                    }, index * 150); // Animación escalonada cada 150ms
                });

                // Crear el carrusel con navegación después de que se carguen todas las tarjetas
                setTimeout(() => {
                    createRelatedEventsCarousel();
                }, eventosRelacionados.length * 150 + 300);
            } else {
                cardsContainer.innerHTML = '<div class="no-events">No se encontraron eventos relacionados</div>';
            }
        })
        .catch(error => {
            console.error('Error al cargar eventos relacionados:', error);
            document.getElementById('related-events-carousel').innerHTML = 
                '<div class="error-message">No se pudieron cargar los eventos relacionados</div>';
        });
    }, 1000); // Mostrar loading por 1 segundo
}

function createRelatedEventsCarousel() {
    const cardsContainer = document.getElementById('related-events-carousel');
    const prevButton = document.getElementById('related-events-prev');
    const nextButton = document.getElementById('related-events-next');

    if (!cardsContainer || !prevButton || !nextButton) {
        console.error('No se encontraron elementos necesarios para el carrusel de eventos relacionados');
        return;
    }

    let currentIndex = 0;
    let autoScrollInterval;

    function getVisibleCardsCount() {
        const containerWidth = cardsContainer.clientWidth;
        const cardElement = cardsContainer.querySelector('.carousel-event-item');
        if (!cardElement) return 1;
        const cardWidth = cardElement.offsetWidth;
        const gap = 16;
        return Math.floor(containerWidth / (cardWidth + gap));
    }

    const totalCards = cardsContainer.querySelectorAll('.carousel-event-item').length;

    function scrollToIndex(index) {
        const cardElement = cardsContainer.querySelector('.carousel-event-item');
        if (!cardElement) return;
        
        const cardWidth = cardElement.offsetWidth;
        const gap = 16;
        const maxIndex = totalCards - getVisibleCardsCount();
        
        if (index > maxIndex) index = 0;
        if (index < 0) index = maxIndex;

        currentIndex = index;
        const scrollLeftValue = index * (cardWidth + gap);
        
        cardsContainer.scrollTo({
            left: scrollLeftValue,
            behavior: 'smooth'
        });
    }

    function autoScroll() {
        scrollToIndex(currentIndex + 1);
    }

    function startAutoScroll() {
        clearInterval(autoScrollInterval);
        autoScrollInterval = setInterval(autoScroll, 5000);
    }

    function stopAutoScroll() {
        clearInterval(autoScrollInterval);
    }

    startAutoScroll();

    nextButton.addEventListener('click', function() {
        stopAutoScroll();
        scrollToIndex(currentIndex + 1);
        startAutoScroll();
    });

    prevButton.addEventListener('click', function() {
        stopAutoScroll();
        scrollToIndex(currentIndex - 1);
        startAutoScroll();
    });

    cardsContainer.addEventListener('mouseenter', stopAutoScroll);
    cardsContainer.addEventListener('mouseleave', startAutoScroll);

    window.addEventListener('resize', function() {
        scrollToIndex(currentIndex);
    });
}

// =============================================================================
// FUNCIONES AUXILIARES PARA EVENTOS
// =============================================================================

function formatearPrecio(precio, esGratuito) {
    return esGratuito ? "Entrada Gratuita" : `Desde $ ${Number(precio).toLocaleString('es-CO')}`;
}

function determinarEstadoEvento(evento) {
    const fechaEvento = new Date(evento.fecha_inicio);
    const hoy = new Date();
    const diasParaEvento = Math.floor((fechaEvento - hoy) / (1000 * 60 * 60 * 24));
    const horasParaEvento = Math.floor((fechaEvento - hoy) / (1000 * 60 * 60));

    if (diasParaEvento <= 0 && horasParaEvento > -24) {
        return "Evento en curso";
    } else if (diasParaEvento <= 1) {
        return "Evento próximo a iniciar";
    } else if (diasParaEvento <= 3) {
        return "Evento muy pronto";
    } else if (diasParaEvento <= 7) {
        return "Evento esta semana";
    }

    return null;
}

function incrementarVisitas(idEvento) {
    fetch('assets/components/eventos/IncrementView.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id_evento: idEvento
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.success ? "Visita registrada" : "Error al registrar visita");
    })
    .catch(error => {
        console.error('Error al incrementar visitas:', error);
    });
}

// =============================================================================
// FUNCIONES DE TICKETS (OPCIONAL)
// =============================================================================

function initializeTicketCounter() {
    const minusBtn = document.querySelector('.counter-btn.minus');
    const plusBtn = document.querySelector('.counter-btn.plus');

    if (minusBtn && plusBtn) {
        minusBtn.addEventListener('click', function () {
            let count = parseInt(document.querySelector('.counter-display').textContent);
            if (count > 1) {
                document.querySelector('.counter-display').textContent = count - 1;
                updatePrice(count - 1);
            }
        });

        plusBtn.addEventListener('click', function () {
            let count = parseInt(document.querySelector('.counter-display').textContent);
            document.querySelector('.counter-display').textContent = count + 1;
            updatePrice(count + 1);
        });
    }
}

function updatePrice(count) {
    const basePrice = 25.00;
    const fees = 3.52;
    const total = (basePrice * count) + fees;
    const checkoutBtn = document.querySelector('.btn-checkout');
    if (checkoutBtn) {
        checkoutBtn.textContent = `Check out for ${total.toFixed(2)}`;
    }
}

// =============================================================================
// GALERÍA DE IMÁGENES 2x2 (VERSIÓN MEJORADA)
// =============================================================================

// Refactor: reutilizar utilidades de imágenes
function createEventGallery(evento) {
    let urls = getEventImages(evento);

    const placeholderImages = [
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=400&q=80'
    ];
    while (urls.length < 4) urls.push(placeholderImages[urls.length % placeholderImages.length]);
    urls = urls.slice(0, 4);

    const imagenes = urls.map(u => ({ url: u, alt: evento.nombre || 'Imagen del evento' }));

    const gallerySection = document.createElement('div');
    gallerySection.className = 'event-gallery';
    gallerySection.innerHTML = `
        <h2 class="gallery-title">Galería del evento</h2>
        <div class="gallery-grid">
            ${imagenes.map((img, index) => `
                <div class="gallery-item" data-index="${index}">
                    <img src="${img.url}" alt="${img.alt}" loading="lazy" onerror="this.style.display='none'">
                    <div class="gallery-overlay"><div class="gallery-zoom-icon">🔍</div></div>
                </div>
            `).join('')}
        </div>`;

    const eventDetailsGrid = document.querySelector('.event-details-grid');
    if (eventDetailsGrid && eventDetailsGrid.parentNode) {
        eventDetailsGrid.parentNode.insertBefore(gallerySection, eventDetailsGrid.nextSibling);
    }

    createImageModal(imagenes);
    setupGalleryEvents();
}

function createImageModal(imagenes) {
    // Crear modal HTML
    const modalHTML = `
        <div class="image-modal" id="imageModal">
            <div class="image-modal-content">
                <button class="image-modal-nav image-modal-prev" id="modalPrev">‹</button>
                <img id="modalImage" src="" alt="">
                <button class="image-modal-nav image-modal-next" id="modalNext">›</button>
                <div class="image-modal-counter" id="modalCounter">1 / 4</div>
            </div>
        </div>
        `;

    // Agregar al body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Variables globales para el modal
    window.galleryImages = imagenes;
    window.currentImageIndex = 0;
}

function setupGalleryEvents() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const modal = document.getElementById('imageModal');

    if (!modal) return;

    const modalImage = document.getElementById('modalImage');
    const modalCounter = document.getElementById('modalCounter');
    const modalClose = document.getElementById('modalClose');
    const modalPrev = document.getElementById('modalPrev');
    const modalNext = document.getElementById('modalNext');

    // Event listeners para abrir el modal
    galleryItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            openImageModal(index);
        });
    });

    // Event listeners para controles del modal
    if (modalClose) modalClose.addEventListener('click', closeImageModal);
    if (modalPrev) modalPrev.addEventListener('click', showPrevImage);
    if (modalNext) modalNext.addEventListener('click', showNextImage);

    // Cerrar modal con ESC o click fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeImageModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (modal.classList.contains('show')) {
            switch (e.key) {
                case 'Escape':
                    closeImageModal();
                    break;
                case 'ArrowLeft':
                    showPrevImage();
                    break;
                case 'ArrowRight':
                    showNextImage();
                    break;
            }
        }
    });
}

function openImageModal(index) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalCounter = document.getElementById('modalCounter');

    if (!modal || !modalImage || !modalCounter) return;

    window.currentImageIndex = index;

    modalImage.src = window.galleryImages[index].url;
    modalImage.alt = window.galleryImages[index].alt;
    modalCounter.textContent = `${index + 1} / ${window.galleryImages.length}`;

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (!modal) return;

    modal.classList.remove('show');
    document.body.style.overflow = '';
}

function showPrevImage() {
    window.currentImageIndex = window.currentImageIndex > 0 ?
        window.currentImageIndex - 1 :
        window.galleryImages.length - 1;

    updateModalImage();
}

function showNextImage() {
    window.currentImageIndex = window.currentImageIndex < window.galleryImages.length - 1 ?
        window.currentImageIndex + 1 :
        0;

    updateModalImage();
}

function updateModalImage() {
    const modalImage = document.getElementById('modalImage');
    const modalCounter = document.getElementById('modalCounter');

    if (!modalImage || !modalCounter) return;

    modalImage.src = window.galleryImages[window.currentImageIndex].url;
    modalImage.alt = window.galleryImages[window.currentImageIndex].alt;
    modalCounter.textContent = `${window.currentImageIndex + 1} / ${window.galleryImages.length}`;
}

// =============================================================================
// FUNCIONES PARA MAPA DINÁMICO
// =============================================================================

function createDynamicMap(evento) {
    // Construir la dirección completa para la búsqueda
    let direccionCompleta = '';
    const componentes = [];

    if (evento.ubicacion) {
        componentes.push(evento.ubicacion);
    }

    if (evento.direccion && evento.direccion !== evento.ubicacion) {
        componentes.push(evento.direccion);
    }

    if (evento.nombre_municipio) {
        componentes.push(evento.nombre_municipio);
    }

    if (evento.departamento) {
        componentes.push(evento.departamento);
    }

    // Siempre agregar Colombia
    componentes.push('Colombia');

    direccionCompleta = componentes.join(', ');

    // Buscar coordenadas usando Nominatim
    buscarCoordenadas(direccionCompleta, evento);
}

async function buscarCoordenadas(direccion, evento) {
    try {
        // URL de Nominatim para búsqueda
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1&countrycodes=co`;

        const response = await fetch(nominatimUrl);
        const data = await response.json();

        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);

            // Crear el mapa con las coordenadas encontradas
            actualizarMapa(lat, lon, direccion);
        } else {
            // Fallback: usar mapa de búsqueda por nombre
            actualizarMapaPorNombre(direccion);
        }
    } catch (error) {
        console.error('❌ Error al buscar coordenadas:', error);
        // Fallback: usar mapa de búsqueda por nombre
        actualizarMapaPorNombre(direccion);
    }
}

function actualizarMapa(lat, lon, direccion) {
    const mapContainer = document.querySelector('.map-container iframe');
    if (mapContainer) {
        // Crear bbox alrededor de las coordenadas (aproximadamente 1km de radio)
        const delta = 0.01; // Aproximadamente 1km
        const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;

        const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;

        mapContainer.src = mapUrl;
    }
}

function actualizarMapaPorNombre(direccion) {
    const mapContainer = document.querySelector('.map-container iframe');
    if (mapContainer) {
        // Usar un servicio alternativo que permita búsqueda por nombre
        const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(direccion)}&output=embed`;

        mapContainer.src = mapUrl;
        mapContainer.style.filter = 'hue-rotate(15deg) saturate(0.7)'; // Estilo más neutro
    }
}

// =============================================================================
// FUNCIONES UTILITARIAS
// =============================================================================

function formatearFecha(fechaInicioString, fechaFinString = null) {
    const fechaInicio = new Date(fechaInicioString);
    const fechaFin = fechaFinString ? new Date(fechaFinString) : null;
    const hoy = new Date();
    const manana = new Date();
    manana.setDate(hoy.getDate() + 1);

    // Función auxiliar para formatear fecha completa
    function formatearFechaCompleta(fecha) {
        const opciones = {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        };
        return fecha.toLocaleDateString('es-ES', opciones);
    }

    // Función para formatear hora
    function formatearHora(fecha) {
        return fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }

    // Si no hay fecha fin, es null, undefined o es el mismo día
    if (!fechaFin || fechaFinString === null || fechaFinString === undefined || fechaInicio.toDateString() === fechaFin.toDateString()) {
        if (fechaInicio.toDateString() === hoy.toDateString()) {
            return `hoy`;
        } else if (fechaInicio.toDateString() === manana.toDateString()) {
            return `mañana`;
        } else {
            return `${formatearFechaCompleta(fechaInicio)}`;
        }
    }

    // Si hay fecha fin diferente, mostrar rango
    const fechaInicioFormateada = formatearFechaCompleta(fechaInicio);
    const fechaFinFormateada = formatearFechaCompleta(fechaFin);
    
    return `${fechaInicioFormateada} - ${fechaFinFormateada}`;
}

// =============================================================================
// MODAL DE REGISTRO
// =============================================================================

class EventRegistrationModal {
    constructor() {
        this.modal = document.getElementById('registrationModal');
        this.form = document.getElementById('registrationForm');
        this.successMessage = document.getElementById('successMessage');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.submitBtn = document.getElementById('submitBtn');

        if (!this.modal) {
            console.error('❌ Modal HTML no encontrado en el DOM');
            return;
        }

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Cerrar modal
        const modalClose = document.getElementById('modalClose');
        const cancelBtn = document.getElementById('cancelBtn');

        if (modalClose) modalClose.addEventListener('click', () => this.closeModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

        // Cerrar con ESC o click fuera
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('show')) {
                this.closeModal();
            }
        });

        // Submit del formulario
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Validación en tiempo real
        this.setupRealTimeValidation();
    }

    openModal(eventData = {}) {
        // Actualizar información del ticket
        this.updateTicketInformation(eventData);

        this.modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Focus en el primer campo
        setTimeout(() => {
            const fullNameInput = document.getElementById('fullName');
            if (fullNameInput) fullNameInput.focus();
        }, 300);
    }

    updateTicketInformation(eventData) {
        // Determinar el tipo de evento
        const eventType = eventData.precio && parseFloat(eventData.precio) > 0 ?
            `${eventData.precio}` : 'Evento Gratuito';

        // Actualizar elementos del ticket con verificación de existencia
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };

        updateElement('ticketEventType', eventType);
        updateElement('ticketEventName', eventData.nombre || eventData.name || 'Evento');
        updateElement('ticketEventDescription', eventData.descripcion || eventData.details || eventData.description || 'Información del evento');

        // Formatear fecha
        if (eventData.fecha_inicio) {
            const fecha = new Date(eventData.fecha_inicio);
            const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            updateElement('ticketEventDate', fechaFormateada);

            // Formatear hora
            const horaFormateada = fecha.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
            updateElement('ticketEventTime', horaFormateada);
        }

        // Ubicación
        const ubicacion = eventData.ubicacion || eventData.location || 'Por definir';
        const direccion = eventData.direccion || '';
        const ubicacionCompleta = direccion ? `${ubicacion}, ${direccion}` : ubicacion;
        updateElement('ticketEventLocation', ubicacionCompleta);

        // Cupos disponibles
        const cupos = eventData.cupos_disponibles || eventData.capacity || 'Limitados';
        const cuposText = typeof cupos === 'number' ? `${cupos} disponibles` : cupos;
        updateElement('ticketEventCapacity', cuposText);
    }

    closeModal() {
        this.modal.classList.remove('show');
        document.body.style.overflow = '';

        // Reset del formulario después de la animación
        setTimeout(() => {
            this.resetForm();
        }, 300);
    }

    resetForm() {
        if (this.form) {
            this.form.reset();
            this.form.style.display = 'block';
        }
        if (this.successMessage) {
            this.successMessage.style.display = 'none';
        }
        this.clearErrors();
        this.toggleLoading(false);
    }

    setupRealTimeValidation() {
        const inputs = document.querySelectorAll('.form-input');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMsg = '';

        switch (field.type) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!value) {
                    errorMsg = 'El email es requerido';
                    isValid = false;
                } else if (!emailRegex.test(value)) {
                    errorMsg = 'Por favor ingresa un email válido';
                    isValid = false;
                }
                break;
            case 'tel':
                if (!value) {
                    errorMsg = 'El teléfono es requerido';
                    isValid = false;
                } else if (value.length < 10) {
                    errorMsg = 'Por favor ingresa un teléfono válido';
                    isValid = false;
                }
                break;
            default:
                if (field.required && !value) {
                    errorMsg = 'Este campo es requerido';
                    isValid = false;
                }
        }

        this.showFieldError(field, errorMsg);
        return isValid;
    }

    showFieldError(field, message) {
        const errorElement = field.parentNode.querySelector('.error-message');
        if (errorElement) {
            if (message) {
                field.classList.add('error');
                errorElement.textContent = message;
                errorElement.style.display = 'block';
            } else {
                field.classList.remove('error');
                errorElement.style.display = 'none';
            }
        }
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorElement = field.parentNode.querySelector('.error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    clearErrors() {
        const inputs = document.querySelectorAll('.form-input');
        inputs.forEach(input => this.clearFieldError(input));
    }

    validateForm() {
        const requiredFields = document.querySelectorAll('.form-input[required]');
        const termsCheckbox = document.getElementById('terms');
        let isValid = true;

        // Validar campos requeridos
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        // Validar términos y condiciones
        if (termsCheckbox && !termsCheckbox.checked) {
            alert('Debes aceptar los términos y condiciones para continuar');
            isValid = false;
        }

        return isValid;
    }

    toggleLoading(loading) {
        if (this.submitBtn) {
            if (loading) {
                if (this.loadingSpinner) this.loadingSpinner.style.display = 'block';
                this.submitBtn.disabled = true;
                this.submitBtn.innerHTML = '<span class="loading-spinner" style="display: block;"></span>Procesando...';
            } else {
                if (this.loadingSpinner) this.loadingSpinner.style.display = 'none';
                this.submitBtn.disabled = false;
                this.submitBtn.innerHTML = 'Confirmar Registro';
            }
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.validateForm()) {
            return;
        }

        this.toggleLoading(true);

        try {
            // Simular envío de datos (reemplazar con tu API)
            const formData = new FormData(this.form);
            const data = Object.fromEntries(formData);

            // Aquí harías la petición real a tu backend
            await this.simulateAPICall(data);

            // Mostrar mensaje de éxito
            this.showSuccess();

        } catch (error) {
            console.error('Error al registrar:', error);
            alert('Hubo un error al procesar tu registro. Por favor intenta nuevamente.');
        } finally {
            this.toggleLoading(false);
        }
    }

    async simulateAPICall(data) {
        // Simular llamada a API
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 2000);
        });
    }

    showSuccess() {
        if (this.form) this.form.style.display = 'none';
        if (this.successMessage) this.successMessage.style.display = 'block';

        // Cerrar automáticamente después de 4 segundos
        setTimeout(() => {
            this.closeModal();
        }, 4000);
    }
}

// Función para abrir el modal desde el botón de registro
function openRegistrationModal(eventData = {}) {
    if (window.eventModal) {
        window.eventModal.openModal(eventData);
    } else {
        // Intentar inicializar el modal inmediatamente
        window.eventModal = new EventRegistrationModal();
        if (window.eventModal.modal) {
            window.eventModal.openModal(eventData);
        }
    }
}

// =============================================================================
// INICIALIZACIÓN PRINCIPAL
// =============================================================================

document.addEventListener('DOMContentLoaded', function () {
    // 1. Cargar detalles del evento PRIMERO (incluye banner con fotos)
    setTimeout(() => {
        cargarDetallesEvento();
    }, 500);

    // 2. Inicializar contador de tickets (si existe)
    setTimeout(() => {
        initializeTicketCounter();
    }, 4000);
});