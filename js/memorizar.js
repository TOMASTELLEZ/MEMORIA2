function cargarLocalStorageArray(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn(`No se pudo leer "${key}" desde localStorage:`, error);
        return [];
    }
}

const memorizarData = cargarLocalStorageArray('memorizarVersiculos');
const sinDatos = document.getElementById('sin-datos');
const memorizarContent = document.getElementById('memorizar-content');
const versoInfo = document.getElementById('verso-info');
const progresoText = document.getElementById('progreso-text');
const versoArea = document.getElementById('verso-area');
const mensajeResultado = document.getElementById('mensaje-resultado');
const btnCheck = document.getElementById('btn-check');
const btnNext = document.getElementById('btn-next');
const btnReset = document.getElementById('btn-reset');

let versos = Array.isArray(memorizarData) ? memorizarData : [];
let currentIndex = 0;
let roundNumber = 1;
let currentTokens = [];
let totalPalabras = 0;
let currentVerse = null;

btnCheck?.addEventListener('click', verificarRespuestas);
btnNext?.addEventListener('click', avanzarVerso);
btnReset?.addEventListener('click', reiniciarVerso);

function obtenerIndiceSeleccionado() {
    const parametros = new URLSearchParams(window.location.search);
    const valor = Number(parametros.get('index'));
    return Number.isInteger(valor) && valor >= 0 && valor < versos.length ? valor : 0;
}

if (!versos.length) {
    sinDatos.style.display = 'block';
    memorizarContent.style.display = 'none';
} else {
    currentIndex = obtenerIndiceSeleccionado();
    sinDatos.style.display = 'none';
    memorizarContent.style.display = 'block';
    iniciarVerso();
}

function iniciarVerso() {
    currentVerse = versos[currentIndex];
    currentTokens = tokenizarVerso(currentVerse.texto);
    totalPalabras = currentTokens.filter(token => token.isWord).length;
    roundNumber = 1;
    ocultarPalabras();
    renderizarVerso();
    actualizarProgreso();
    mensajeResultado.textContent = '';
    btnNext.disabled = true;
}

function tokenizarVerso(texto) {
    const partes = texto.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+|[^\sA-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/g) || [texto];
    return partes.map(parte => ({
        text: parte,
        isWord: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+$/.test(parte),
        hidden: false
    }));
}

function ocultarPalabras() {
    const palabras = currentTokens.filter(token => token.isWord && !token.hidden);
    const ocultasActuales = currentTokens.filter(token => token.isWord && token.hidden).length;
    const objetivo = Math.min(3 + (roundNumber - 1) * 2, totalPalabras);
    const faltan = objetivo - ocultasActuales;
    if (faltan <= 0) {
        return;
    }

    const candidatos = palabras.slice();
    shuffle(candidatos);
    candidatos.slice(0, faltan).forEach(token => token.hidden = true);
}

function renderizarVerso() {
    versoArea.innerHTML = '';

    currentTokens.forEach((token, index) => {
        if (token.isWord && token.hidden) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'memorizacion-input';
            input.dataset.index = index;
            input.placeholder = '...';
            input.autocomplete = 'off';
            
            // Agregar listener para Enter y pasar al siguiente input
            input.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    const inputs = Array.from(versoArea.querySelectorAll('input[data-index]'));
                    const currentInputIndex = inputs.indexOf(input);
                    
                    if (currentInputIndex >= 0 && currentInputIndex < inputs.length - 1) {
                        // Hay siguiente input, hacer focus
                        inputs[currentInputIndex + 1].focus();
                    } else if (currentInputIndex === inputs.length - 1) {
                        // Es el último input, hacer focus al botón de verificar
                        btnCheck.focus();
                    }
                }
            });
            
            versoArea.appendChild(input);
        } else {
            const span = document.createElement('span');
            span.className = 'verso-texto';
            span.textContent = token.text;
            versoArea.appendChild(span);
        }
        versoArea.appendChild(document.createTextNode(' '));
    });
}

function verificarRespuestas() {
    if (!currentTokens.length) return;

    const inputs = Array.from(versoArea.querySelectorAll('input[data-index]'));
    if (!inputs.length) {
        mensajeResultado.textContent = 'No hay palabras ocultas. Haz clic en reiniciar para practicar otra vez.';
        mensajeResultado.className = 'mensaje-resultado mensaje-neutral';
        return;
    }

    let respuestasCorrectas = true;

    inputs.forEach(input => {
        const index = Number(input.dataset.index);
        const token = currentTokens[index];
        const valor = normalizarTexto(input.value);
        const esperado = normalizarTexto(token.text);
        if (valor === esperado && valor.length > 0) {
            input.classList.remove('input-incorrecto');
            input.classList.add('input-correcto');
        } else {
            input.classList.remove('input-correcto');
            input.classList.add('input-incorrecto');
            respuestasCorrectas = false;
        }
    });

    if (!respuestasCorrectas) {
        mensajeResultado.textContent = 'Revisa las palabras marcadas en rojo y vuelve a intentar.';
        mensajeResultado.className = 'mensaje-resultado mensaje-error';
        return;
    }

    if (estaCompleto()) {
        mensajeResultado.textContent = '¡Muy bien! Has memorizado este verso.';
        mensajeResultado.className = 'mensaje-resultado mensaje-exito';
        btnNext.disabled = false;
        btnCheck.disabled = true;
        return;
    }

    mensajeResultado.textContent = 'Correcto. Preparando siguiente nivel...';
    mensajeResultado.className = 'mensaje-resultado mensaje-exito';
    btnCheck.disabled = true;

    setTimeout(() => {
        roundNumber += 1;
        ocultarPalabras();
        renderizarVerso();
        actualizarProgreso();
        mensajeResultado.textContent = '';
        btnCheck.disabled = false;
    }, 1000);
}

function estaCompleto() {
    return currentTokens.filter(token => token.isWord).every(token => token.hidden);
}

function avanzarVerso() {
    if (currentIndex >= versos.length - 1) {
        mensajeResultado.textContent = '¡Has completado todos los versículos! Regresa a la Biblia para seleccionar más.';
        mensajeResultado.className = 'mensaje-resultado mensaje-exito';
        btnNext.disabled = true;
        return;
    }

    currentIndex += 1;
    iniciarVerso();
}

function reiniciarVerso() {
    currentTokens.forEach(token => token.hidden = false);
    roundNumber = 1;
    ocultarPalabras();
    renderizarVerso();
    actualizarProgreso();
    mensajeResultado.textContent = '';
    btnCheck.disabled = false;
    btnNext.disabled = true;
}

function actualizarProgreso() {
    progresoText.textContent = `Verso ${currentIndex + 1} de ${versos.length} · Nivel ${roundNumber}`;
    versoInfo.textContent = `${currentVerse.libro} ${currentVerse.capitulo}:${currentVerse.verso}`;
}

function normalizarTexto(texto) {
    return texto.trim().toLowerCase().replace(/\s+/g, ' ');
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
