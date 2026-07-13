const TOTAL_POKEMON = 905;
const BOX_ROWS = 5;
const BOX_COLS = 6;
const PER_BOX = BOX_ROWS * BOX_COLS;
const TOTAL_BOXES = Math.ceil(TOTAL_POKEMON / PER_BOX);
const TABS_PER_PAGE = 5;
const TRUSTED_POKEAPI_PREFIX = 'https://pokeapi.co/api/v2/';
const CACHE_TTL = { species: 30 * 24 * 60 * 60 * 1000, api: 7 * 24 * 60 * 60 * 1000, encounters: 14 * 24 * 60 * 60 * 1000 };
const CACHE_LIMITS = { api: 120, encounters: 80 };

const STORAGE = {
    captured: 'pokemonLivingDexCaptured',
    speciesList: 'pokemonSpeciesListCache:v3',
    api: 'pokemonApiCache:v3:',
    encounters: 'pokemonEncounterCache:v3:',
    encounterConfig: 'pokemonEncounterConfig:v3'
};

const generationRanges = [
    { value: '1', start: 1, end: 151, region: 'Kanto' },
    { value: '2', start: 152, end: 251, region: 'Johto' },
    { value: '3', start: 252, end: 386, region: 'Hoenn' },
    { value: '4', start: 387, end: 493, region: 'Sinnoh' },
    { value: '5', start: 494, end: 649, region: 'Unova' },
    { value: '6', start: 650, end: 721, region: 'Kalos' },
    { value: '7', start: 722, end: 809, region: 'Alola' },
    { value: '8', start: 810, end: 905, region: 'Galar/Hisui' }
];

const typeNames = {
    normal: 'Normal', fire: 'Fogo', water: 'Agua', electric: 'Eletrico',
    grass: 'Grama', ice: 'Gelo', fighting: 'Lutador', poison: 'Veneno',
    ground: 'Terrestre', flying: 'Voador', psychic: 'Psiquico', bug: 'Inseto',
    rock: 'Pedra', ghost: 'Fantasma', dragon: 'Dragao', dark: 'Sombrio',
    steel: 'Metal', fairy: 'Fada'
};

let pokemonData = [];
let pokemonById = new Map();
let capturedPokemon = new Set();
let checklistSelection = new Set();
let checklistCurrentIds = [];
let checklistMatchCount = 0;
let renderedChecklistBoxCount = 1;
let activeBoxIndex = 0;
let visibleBoxStart = 0;
let activeChecklistBoxIndex = 0;
let visibleChecklistBoxStart = 0;
let currentModalPokeId = null;
let lastModalFocus = null;
let checklistRenderFrame = null;
let selectedSuggestionIdx = -1;
let encounterConfigPromise = null;


const detailsCache = new Map();
const encounterCache = new Map();

const dom = {};
let appStarted = false;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}

async function init() {
    if (appStarted) return;
    appStarted = true;

    bindDom();
    bindEvents();
    loadCapturedPokemon();

    try {
        pokemonData = (await loadPokemonList()).map(makePokemonEntry).filter(Boolean);
        if (pokemonData.length !== TOTAL_POKEMON) throw new Error('Lista local de Pokemon invalida.');
        pokemonById = new Map(pokemonData.map(poke => [poke.id, poke]));
        renderBoxes();
        updateBoxArrowState();
        setupChecklist();
        hideLoading();
    } catch (error) {
        console.error('Erro ao carregar Pokedex:', error);
        dom.loading.innerHTML = '<h2>Erro ao carregar dados.</h2>';
    }
}

function bindDom() {
    Object.assign(dom, {
        loading: document.getElementById('loading'),
        boxPage: document.getElementById('boxPage'),
        checklistPage: document.getElementById('checklistPage'),
        boxPageBtn: document.getElementById('boxPageBtn'),
        checklistPageBtn: document.getElementById('checklistPageBtn'),
        dexTransferPanel: document.getElementById('dexTransferPanel'),
        tabs: document.getElementById('tabs'),
        boxesWrapper: document.getElementById('boxes-wrapper'),
        prevBoxPage: document.getElementById('prevBoxPage'),
        nextBoxPage: document.getElementById('nextBoxPage'),
        searchInput: document.getElementById('searchInput'),
        suggestions: document.getElementById('suggestions'),
        searchClear: document.getElementById('searchClear'),
        searchWrapper: document.getElementById('searchWrapper'),
        resultBanner: document.getElementById('resultBanner'),
        bannerSprite: document.getElementById('bannerSprite'),
        bannerText: document.getElementById('bannerText'),
        checklistSearch: document.getElementById('checklistSearch'),
        generationFilter: document.getElementById('generationFilter'),
        statusFilter: document.getElementById('statusFilter'),
        checklistTabs: document.getElementById('checklistTabs'),
        checklistGrid: document.getElementById('checklistGrid'),
        prevChecklistBox: document.getElementById('prevChecklistBox'),
        nextChecklistBox: document.getElementById('nextChecklistBox'),
        batchInfo: document.getElementById('batchInfo'),
        capturedCount: document.getElementById('capturedCount'),
        totalChecklistCount: document.getElementById('totalChecklistCount'),
        capturedPercent: document.getElementById('capturedPercent'),
        capturedProgress: document.getElementById('capturedProgress'),
        importInput: document.getElementById('checklistImportInput'),
        modalBackdrop: document.getElementById('pokemonModalBackdrop'),
        modalContent: document.getElementById('pokemonModalContent'),
        modalPrev: document.getElementById('modalPrev'),
        modalNext: document.getElementById('modalNext'),
        modalClose: document.getElementById('modalClose'),
        modalDialog: document.querySelector('.pokemon-modal')
    });
}

function bindEvents() {
    dom.searchInput.addEventListener('input', debounce(updateSearch, 80));
    dom.searchInput.addEventListener('keydown', handleSearchKeys);
    dom.searchClear.addEventListener('click', clearSearch);
    document.addEventListener('click', event => {
        if (!dom.searchWrapper.contains(event.target)) hideSuggestions();
    });
    document.addEventListener('keydown', handleGlobalKeys);
    document.addEventListener('error', handleSpriteError, true);
    dom.boxPageBtn.addEventListener('click', () => switchPage('boxes'));
    dom.checklistPageBtn.addEventListener('click', () => switchPage('checklist'));
    document.getElementById('exportChecklistBtn').addEventListener('click', exportChecklistToCSV);
    document.getElementById('importChecklistBtn').addEventListener('click', openChecklistImport);
    dom.importInput.addEventListener('change', importChecklistCSV);
    document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);
    document.getElementById('exportBoxesBtn').addEventListener('click', exportToExcelHTML);
    dom.prevBoxPage.addEventListener('click', () => shiftBoxPage(-1));
    dom.nextBoxPage.addEventListener('click', () => shiftBoxPage(1));
    dom.prevChecklistBox.addEventListener('click', () => shiftChecklistBox(-1));
    dom.nextChecklistBox.addEventListener('click', () => shiftChecklistBox(1));
    document.getElementById('selectVisibleChecklistBtn').addEventListener('click', selectVisibleChecklist);
    document.getElementById('confirmCapturedBtn').addEventListener('click', confirmSelectedCaptured);
    document.getElementById('confirmPendingBtn').addEventListener('click', confirmSelectedPending);
    document.getElementById('clearChecklistSelectionBtn').addEventListener('click', clearChecklistSelection);
    dom.modalBackdrop.addEventListener('click', handleModalBackdropClick);
    dom.modalPrev.addEventListener('click', () => navigateModal(-1));
    dom.modalNext.addEventListener('click', () => navigateModal(1));
    dom.modalClose.addEventListener('click', closePokemonModal);
    document.addEventListener('click', handleDynamicAction);
}

function hideLoading() {
    dom.loading.classList.add('hide');
    setTimeout(() => dom.loading.style.display = 'none', 300);
}

async function loadPokemonList() {
    if (Array.isArray(window.POKEMON_SPECIES) && window.POKEMON_SPECIES.length === TOTAL_POKEMON) {
        return window.POKEMON_SPECIES;
    }

    const cached = readCachedStorage(STORAGE.speciesList, CACHE_TTL.species);
    if (Array.isArray(cached) && cached.length === TOTAL_POKEMON) {
        return cached;
    }

    const response = await fetchJson(`https://pokeapi.co/api/v2/pokemon-species?limit=${TOTAL_POKEMON}`, { timeout: 6000, cache: true });
    const list = response.results || [];
    const normalized = list
        .map((item, index) => ({ id: Number(item.id) || index + 1, name: item.name }))
        .filter(item => item.id >= 1 && item.id <= TOTAL_POKEMON && item.name)
        .slice(0, TOTAL_POKEMON);
    writeCachedStorage(STORAGE.speciesList, normalized, CACHE_LIMITS.api);
    return normalized;
}

function makePokemonEntry({ id, name }) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId < 1 || numericId > TOTAL_POKEMON || typeof name !== 'string' || !/^[a-z0-9-]+$/.test(name)) return null;
    const label = displayName(name);
    return {
        id: numericId,
        name,
        label,
        searchName: label.toLowerCase(),
        dexLabel: formatId(numericId),
        generation: generationRanges.find(gen => numericId >= gen.start && numericId <= gen.end),
        boxIndex: Math.floor((numericId - 1) / PER_BOX),
        sprite: officialSprite(numericId),
        fallbackSprite: smallSprite(numericId)
    };
}

function renderBoxes() {
    renderBoxTabs();
    renderActiveBox();
}

function renderActiveBox() {
    const box = document.createElement('div');
    box.className = 'box-container active';
    box.id = `box-${activeBoxIndex}`;

    const grid = document.createElement('div');
    grid.className = 'grid';

    for (let i = 0; i < PER_BOX; i++) {
        const poke = pokemonData[activeBoxIndex * PER_BOX + i];
        const slot = document.createElement('div');

        if (poke) {
            slot.className = 'slot';
            slot.dataset.pokeId = poke.id;
            slot.dataset.action = 'open-pokemon';
            slot.setAttribute('role', 'button');
            slot.tabIndex = 0;
            slot.title = `Ver detalhes de ${poke.label}`;
            slot.innerHTML = `
                <span class="dex-number">${poke.dexLabel}</span>
                <img ${spriteAttrs(poke)} loading="lazy" width="64" height="64">
                <span class="poke-name">${poke.label}</span>
            `;
        } else {
            slot.className = 'slot empty';
            slot.innerHTML = '<span class="poke-name empty-name">Vazio</span>';
        }

        grid.appendChild(slot);
    }

    box.appendChild(grid);
    dom.boxesWrapper.replaceChildren(box);
}

function renderBoxTabs() {
    renderTabStrip(dom.tabs, visibleBoxStart, TOTAL_BOXES, activeBoxIndex);
    updateBoxArrowState();
}

function renderTabStrip(container, visibleStart, boxCount, activeIndex) {
    const fragment = document.createDocumentFragment();
    const end = Math.min(visibleStart + TABS_PER_PAGE, boxCount);

    for (let boxIndex = visibleStart; boxIndex < end; boxIndex++) {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = `tab ${boxIndex === activeIndex ? 'active' : ''}`;
        tab.textContent = `Box ${boxIndex + 1}`;
        tab.dataset.action = 'select-box';
        tab.dataset.boxIndex = boxIndex;
        tab.dataset.tabTarget = container.id === 'checklistTabs' ? 'checklist' : 'boxes';
        fragment.appendChild(tab);
    }

    container.replaceChildren(fragment);
}

function switchTab(boxIndex) {
    activeBoxIndex = clamp(boxIndex, 0, TOTAL_BOXES - 1);
    visibleBoxStart = getVisibleTabStart(activeBoxIndex, TOTAL_BOXES);
    renderBoxes();
}

function shiftBoxPage(direction) {
    switchTab(activeBoxIndex + direction);
}

function updateBoxArrowState() {
    dom.prevBoxPage.disabled = activeBoxIndex <= 0;
    dom.nextBoxPage.disabled = activeBoxIndex >= TOTAL_BOXES - 1;
}

function switchPage(pageName) {
    const showChecklist = pageName === 'checklist';
    dom.boxPage.classList.toggle('active', !showChecklist);
    dom.checklistPage.classList.toggle('active', showChecklist);
    dom.dexTransferPanel.classList.toggle('active', showChecklist);
    dom.boxPageBtn.classList.toggle('active', !showChecklist);
    dom.checklistPageBtn.classList.toggle('active', showChecklist);
    dom.boxPageBtn.setAttribute('aria-pressed', String(!showChecklist));
    dom.checklistPageBtn.setAttribute('aria-pressed', String(showChecklist));
    if (showChecklist) renderChecklist();
}

function setupChecklist() {
    ['checklistSearch', 'generationFilter', 'statusFilter'].forEach(id => {
        dom[id].addEventListener('input', resetChecklistFilters);
        dom[id].addEventListener('change', resetChecklistFilters);
    });
    updateChecklistSummary();
}

function resetChecklistFilters() {
    checklistSelection.clear();
    activeChecklistBoxIndex = 0;
    visibleChecklistBoxStart = 0;
    scheduleChecklistRender();
}

function scheduleChecklistRender() {
    if (checklistRenderFrame) cancelAnimationFrame(checklistRenderFrame);
    checklistRenderFrame = requestAnimationFrame(() => {
        checklistRenderFrame = null;
        renderChecklist();
    });
}

function getChecklistMatches() {
    const search = dom.checklistSearch.value.trim().toLowerCase();
    const generation = dom.generationFilter.value;
    const status = dom.statusFilter.value;

    return pokemonData.filter(poke => {
        const captured = capturedPokemon.has(poke.id);
        if (search && !poke.name.includes(search) && !poke.searchName.includes(search) && !poke.dexLabel.includes(search)) return false;
        if (generation !== 'all' && (!poke.generation || poke.generation.value !== generation)) return false;
        if (status === 'captured' && !captured) return false;
        if (status === 'pending' && captured) return false;
        return true;
    });
}

function renderChecklist() {
    if (!pokemonData.length) return;

    const matches = getChecklistMatches();
    const boxCount = Math.max(1, Math.ceil(matches.length / PER_BOX));
    checklistMatchCount = matches.length;
    renderedChecklistBoxCount = boxCount;
    activeChecklistBoxIndex = clamp(activeChecklistBoxIndex, 0, boxCount - 1);
    visibleChecklistBoxStart = Math.min(visibleChecklistBoxStart, Math.max(0, boxCount - TABS_PER_PAGE));

    const pageItems = matches.slice(activeChecklistBoxIndex * PER_BOX, (activeChecklistBoxIndex + 1) * PER_BOX);
    checklistCurrentIds = pageItems.map(poke => poke.id);

    updateChecklistSummary();
    renderTabStrip(dom.checklistTabs, visibleChecklistBoxStart, boxCount, activeChecklistBoxIndex);
    updateChecklistArrowState(boxCount);
    updateBatchInfo();

    if (!matches.length) {
        dom.checklistGrid.innerHTML = '<div class="checklist-empty">Nenhum Pokemon encontrado com esses filtros.</div>';
        return;
    }

    const html = Array.from({ length: PER_BOX }, (_, index) => {
        const poke = pageItems[index];
        if (!poke) return '<div class="checklist-card empty"><span class="poke-name">Vazio</span></div>';

        const captured = capturedPokemon.has(poke.id);
        const selected = checklistSelection.has(poke.id);
        const gen = poke.generation ? poke.generation.value : '';
        return `
            <article class="checklist-card ${captured ? 'captured' : ''} ${selected ? 'selected' : ''}" data-poke-id="${poke.id}" data-action="toggle-checklist" role="button" tabindex="0" title="${escapeHtml(poke.label)}">
                <span class="selection-dot">${selected ? '&#10003;' : ''}</span>
                <span class="caught-marker" aria-hidden="true">&#10003;</span>
                <span class="dex-number">${poke.dexLabel} · B${poke.boxIndex + 1} · ${gen}ª</span>
                <img ${spriteAttrs(poke)} loading="lazy" width="64" height="64">
                <span class="poke-name">${poke.label}</span>
                <span class="captured-ribbon">Peguei</span>
            </article>
        `;
    }).join('');

    dom.checklistGrid.innerHTML = html;
}

function switchChecklistBox(boxIndex) {
    const boxCount = Math.max(1, Math.ceil(getChecklistMatches().length / PER_BOX));
    activeChecklistBoxIndex = clamp(boxIndex, 0, boxCount - 1);
    visibleChecklistBoxStart = getVisibleTabStart(activeChecklistBoxIndex, boxCount);
    renderChecklist();
}

function shiftChecklistBox(direction) {
    switchChecklistBox(activeChecklistBoxIndex + direction);
}

function updateChecklistArrowState(boxCount) {
    dom.prevChecklistBox.disabled = activeChecklistBoxIndex <= 0;
    dom.nextChecklistBox.disabled = activeChecklistBoxIndex >= boxCount - 1;
}

function toggleChecklistSelection(pokeId) {
    if (checklistSelection.has(pokeId)) checklistSelection.delete(pokeId);
    else checklistSelection.add(pokeId);

    const card = dom.checklistGrid.querySelector(`.checklist-card[data-poke-id="${pokeId}"]`);
    if (!card) return renderChecklist();

    card.classList.toggle('selected', checklistSelection.has(pokeId));
    const dot = card.querySelector('.selection-dot');
    if (dot) dot.textContent = checklistSelection.has(pokeId) ? '✓' : '';
    updateBatchInfo();
}

function selectVisibleChecklist() {
    checklistCurrentIds.forEach(id => checklistSelection.add(id));
    renderChecklist();
}

function clearChecklistSelection() {
    checklistSelection.clear();
    renderChecklist();
}

function confirmSelectedCaptured() {
    checklistSelection.forEach(id => capturedPokemon.add(id));
    checklistSelection.clear();
    saveCapturedPokemon();
    renderChecklist();
}

function confirmSelectedPending() {
    checklistSelection.forEach(id => capturedPokemon.delete(id));
    checklistSelection.clear();
    saveCapturedPokemon();
    renderChecklist();
}

function updateChecklistSummary() {
    const count = capturedPokemon.size;
    const percent = Math.round((count / TOTAL_POKEMON) * 100);
    dom.capturedCount.textContent = count;
    dom.totalChecklistCount.textContent = TOTAL_POKEMON;
    dom.capturedPercent.textContent = `${percent}%`;
    dom.capturedProgress.style.width = `${percent}%`;
}

function updateBatchInfo() {
    const boxCount = renderedChecklistBoxCount;
    const visible = checklistCurrentIds.length;
    const result = checklistMatchCount === 0
        ? 'sem resultados'
        : `Box ${activeChecklistBoxIndex + 1} de ${boxCount} · ${visible} visiveis`;
    dom.batchInfo.textContent = `${checklistSelection.size} selecionados · ${result}`;
}

function loadCapturedPokemon() {
    const saved = readStorage(STORAGE.captured);
    capturedPokemon = new Set((Array.isArray(saved) ? saved : []).map(Number).filter(id => id >= 1 && id <= TOTAL_POKEMON));
}

function saveCapturedPokemon() {
    writeStorage(STORAGE.captured, [...capturedPokemon].sort((a, b) => a - b));
}

function updateSearch() {
    const query = dom.searchInput.value.trim().toLowerCase();
    dom.searchClear.style.display = query ? 'block' : 'none';

    if (!query) return hideSuggestions();

    const matches = pokemonData
        .filter(poke => poke.name.includes(query) || poke.searchName.includes(query) || poke.dexLabel.includes(query))
        .slice(0, 8);
    selectedSuggestionIdx = -1;
    renderSuggestions(matches, query);
}

function renderSuggestions(matches, query) {
    if (!matches.length) {
        dom.suggestions.innerHTML = '<div class="no-results">Nenhum Pokemon encontrado</div>';
        dom.suggestions.classList.add('visible');
        return;
    }

    dom.suggestions.innerHTML = matches.map(poke => {
        const highlighted = poke.label.replace(new RegExp(`(${escapeRegex(query)})`, 'gi'), '<mark>$1</mark>');
        return `
            <div class="suggestion-item" data-id="${poke.id}" data-action="select-pokemon" role="button" tabindex="0">
                <img ${spriteAttrs(poke)} width="40" height="40">
                <div class="suggestion-info">
                    <span class="suggestion-name">${highlighted}</span>
                    <span class="suggestion-detail">${poke.dexLabel} · Box ${poke.boxIndex + 1}</span>
                </div>
            </div>
        `;
    }).join('');
    dom.suggestions.classList.add('visible');
}

function handleSearchKeys(event) {
    const items = dom.suggestions.querySelectorAll('.suggestion-item');
    if (!items.length) return;

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectedSuggestionIdx = Math.min(selectedSuggestionIdx + 1, items.length - 1);
        updateSuggestionSelection(items);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectedSuggestionIdx = Math.max(selectedSuggestionIdx - 1, 0);
        updateSuggestionSelection(items);
    } else if (event.key === 'Enter') {
        event.preventDefault();
        (items[selectedSuggestionIdx] || items[0]).click();
    } else if (event.key === 'Escape') {
        hideSuggestions();
    }
}

function updateSuggestionSelection(items) {
    items.forEach((item, index) => item.classList.toggle('selected', index === selectedSuggestionIdx));
    if (items[selectedSuggestionIdx]) items[selectedSuggestionIdx].scrollIntoView({ block: 'nearest' });
}

function hideSuggestions() {
    dom.suggestions.classList.remove('visible');
    selectedSuggestionIdx = -1;
}

function selectPokemon(pokeId) {
    const poke = pokemonById.get(pokeId);
    if (!poke) return;

    hideSuggestions();
    dom.searchInput.value = poke.label;
    dom.searchClear.style.display = 'block';
    dom.bannerSprite.src = poke.sprite;
    dom.bannerSprite.dataset.fallbackSrc = poke.fallbackSprite;
    dom.bannerText.textContent = `${poke.dexLabel} ${poke.label} esta na Box ${poke.boxIndex + 1}`;
    dom.resultBanner.classList.add('visible');

    switchTab(poke.boxIndex);
    requestAnimationFrame(() => {
        const slot = dom.boxesWrapper.querySelector(`.slot[data-poke-id="${pokeId}"]`);
        if (slot) {
            slot.classList.add('highlighted');
            slot.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

function clearSearch() {
    dom.searchInput.value = '';
    dom.searchClear.style.display = 'none';
    hideSuggestions();
    dom.resultBanner.classList.remove('visible');
    document.querySelectorAll('.slot.highlighted').forEach(slot => slot.classList.remove('highlighted'));
    document.querySelectorAll('.tab.has-result').forEach(tab => tab.classList.remove('has-result'));
}

function openPokemonDetails(pokeId) {
    const poke = pokemonById.get(pokeId);
    if (!poke) return;

    if (!dom.modalBackdrop.classList.contains('visible')) {
        lastModalFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    currentModalPokeId = pokeId;
    updateModalNavButtons();
    dom.modalBackdrop.classList.add('visible');
    dom.modalClose.focus();

    renderModal(createInstantDetail(poke));
    afterNextPaint(() => loadOpenPokemonDetails(poke, pokeId));
}

async function loadOpenPokemonDetails(poke, pokeId) {
    try {
        const detail = detailsCache.get(pokeId) || await loadPokemonDetail(poke);
        if (currentModalPokeId !== pokeId) return;
        detailsCache.set(pokeId, detail);
        renderModal(detail);
        if (detail.evolutionChain === null) loadEvolution(detail);
    } catch (error) {
        console.warn('Detalhes externos indisponiveis:', error);
        if (currentModalPokeId === pokeId) {
            updateModalFallback();
        }
    }
}

function afterNextPaint(callback) {
    requestAnimationFrame(() => setTimeout(callback, 0));
}

function createInstantDetail(poke) {
    return {
        id: poke.id,
        name: poke.name,
        label: poke.label,
        sprite: poke.sprite,
        fallbackSprite: poke.fallbackSprite,
        types: [],
        description: 'Carregando descricao...',
        category: 'Carregando categoria...',
        region: `${poke.label} esta registrado na Pokedex Nacional como ${poke.dexLabel}.`,
        evolutionChain: null
    };
}

async function loadPokemonDetail(poke) {
    const [pokemon, species] = await Promise.all([
        fetchJson(`https://pokeapi.co/api/v2/pokemon/${poke.id}`, { timeout: 5000, cache: true }),
        fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${poke.id}`, { timeout: 5000, cache: true })
    ]);

    const description = pickLocalizedText(species.flavor_text_entries, entry => entry.flavor_text);
    const category = pickLocalizedText(species.genera, entry => entry.genus);
    const detail = {
        id: poke.id,
        name: poke.name,
        label: poke.label,
        sprite: poke.sprite,
        fallbackSprite: poke.fallbackSprite,
        types: pokemon.types.map(item => item.type.name),
        description: description.text || 'Descricao nao disponivel.',
        descriptionLanguage: description.language,
        category: category.text || 'Categoria nao informada.',
        categoryLanguage: category.language,
        region: getSpeciesRegion(species),
        evolutionChain: null,
        evolutionChainUrl: species.evolution_chain ? species.evolution_chain.url : ''
    };

    return detail;
}

async function loadEvolution(detail) {
    if (!detail.evolutionChainUrl) return;

    try {
        const chain = await fetchJson(detail.evolutionChainUrl, { timeout: 5000, cache: true });
        const evolutionInfo = getEvolutionInfo(chain.chain);
        const cached = { ...detail, evolutionChain: evolutionInfo };
        detailsCache.set(detail.id, cached);

        if (currentModalPokeId === detail.id) {
            const el = document.getElementById('detailEvolution');
            if (el) el.innerHTML = evolutionInfo.length ? evolutionInfo.join('') : '<p>Este Pokemon nao possui linha evolutiva conhecida.</p>';
        }
    } catch (error) {
        const el = document.getElementById('detailEvolution');
        if (currentModalPokeId === detail.id && el) {
            el.innerHTML = '<p class="detail-loading">Linha evolutiva indisponivel agora.</p>';
        }
    }
}

function renderModal(detail) {
    const typeBadges = detail.types.length
        ? detail.types.map(type => {
            const safeType = Object.prototype.hasOwnProperty.call(typeNames, type) ? type : 'unknown';
            return `<span class="type-badge type-${safeType}">${escapeHtml(typeNames[type] || displayName(type))}</span>`;
        }).join('')
        : '<span class="type-placeholder">Carregando tipos...</span>';
    const evolution = detail.evolutionChain === null
        ? '<p class="detail-loading">Carregando linha evolutiva...</p>'
        : detail.evolutionChain.length
            ? detail.evolutionChain.join('')
            : '<p>Este Pokemon nao possui linha evolutiva conhecida.</p>';

    dom.modalContent.innerHTML = `
        <div class="modal-header">
            <img class="modal-sprite" ${spriteAttrs(detail)}>
            <div>
                <div class="modal-dex">${formatId(detail.id)}</div>
                <h2 class="modal-name" id="modalPokemonName">${escapeHtml(displayName(detail.name))}</h2>
                <div class="type-row">${typeBadges}</div>
                ${renderPokemonDatabaseLink(detail)}
            </div>
        </div>
        <div class="modal-section">
            <h3>Descricao</h3>
            <p id="detailDescription">${escapeHtml(detail.description)}</p>
        </div>
        <div class="modal-section">
            <h3>Regiao</h3>
            <p>${escapeHtml(detail.region)}</p>
        </div>
        <div class="modal-section">
            <h3>Categoria</h3>
            <p id="detailCategory">${escapeHtml(detail.category)}</p>
        </div>
        <div class="modal-section">
            <h3>Linha evolutiva</h3>
            <div id="detailEvolution">${evolution}</div>
        </div>
        <div class="modal-section">
            <button class="encounter-toggle-btn" data-action="toggle-encounters" data-poke-id="${detail.id}">
                <span>📍</span> Onde encontrar este Pokemon?
                <span class="toggle-arrow">▼</span>
            </button>
            <div class="encounter-content" id="encounterContent-${detail.id}"></div>
        </div>
    `;
}

function updateModalFallback() {
    const description = document.getElementById('detailDescription');
    const category = document.getElementById('detailCategory');
    const evolution = document.getElementById('detailEvolution');
    if (description) description.textContent = 'Detalhes externos indisponiveis agora.';
    if (category) category.textContent = 'Nao informada.';
    if (evolution) evolution.innerHTML = '<p class="detail-loading">Linha evolutiva indisponivel agora.</p>';
}

function closePokemonModal() {
    dom.modalBackdrop.classList.remove('visible');
    currentModalPokeId = null;
    if (lastModalFocus && lastModalFocus.isConnected) lastModalFocus.focus();
    lastModalFocus = null;
}

function handleModalBackdropClick(event) {
    if (event.target.id === 'pokemonModalBackdrop') closePokemonModal();
}

function navigateModal(direction) {
    if (!currentModalPokeId) return;
    const nextId = currentModalPokeId + direction;
    if (nextId >= 1 && nextId <= TOTAL_POKEMON) openPokemonDetails(nextId);
}



function updateModalNavButtons() {
    dom.modalPrev.disabled = currentModalPokeId <= 1;
    dom.modalNext.disabled = currentModalPokeId >= TOTAL_POKEMON;
}

function handleGlobalKeys(event) {
    if (event.key === 'Escape' && dom.modalBackdrop.classList.contains('visible')) closePokemonModal();
    else if (currentModalPokeId && event.key === 'ArrowLeft') navigateModal(-1);
    else if (currentModalPokeId && event.key === 'ArrowRight') navigateModal(1);
    else if (currentModalPokeId && event.key === 'Tab') trapModalFocus(event);
    else if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof Element && event.target.matches('[data-action]')) {
        event.preventDefault();
        event.target.click();
    }
}

function trapModalFocus(event) {
    const focusable = [...dom.modalBackdrop.querySelectorAll('button:not([disabled]), [href], [tabindex="0"]')]
        .filter(element => element instanceof HTMLElement && element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

function handleDynamicAction(event) {
    const target = event.target instanceof Element ? event.target.closest('[data-action]') : null;
    if (!target) return;
    const id = Number(target.dataset.pokeId || target.dataset.id);
    if (target.dataset.action === 'open-pokemon' && Number.isInteger(id)) openPokemonDetails(id);
    else if (target.dataset.action === 'select-pokemon' && Number.isInteger(id)) selectPokemon(id);
    else if (target.dataset.action === 'toggle-checklist' && Number.isInteger(id)) toggleChecklistSelection(id);
    else if (target.dataset.action === 'toggle-encounters' && Number.isInteger(id)) toggleEncounterSection(id, target);
    else if (target.dataset.action === 'select-box') {
        const boxIndex = Number(target.dataset.boxIndex);
        if (Number.isInteger(boxIndex)) (target.dataset.tabTarget === 'checklist' ? switchChecklistBox : switchTab)(boxIndex);
    }
}

async function toggleEncounterSection(pokeId, btn) {
    const content = document.getElementById(`encounterContent-${pokeId}`);
    if (!content) return;

    const isOpen = content.classList.contains('visible');
    if (isOpen) {
        content.classList.remove('visible');
        btn.classList.remove('open');
        return;
    }

    btn.classList.add('open');
    content.classList.add('visible');
    if (content.dataset.loaded === 'true') return;

    content.innerHTML = '<div class="encounter-loading">Buscando localizacoes...</div>';

    try {
        const [config, encounters] = await Promise.all([
            loadEncounterConfig(),
            loadEncounters(pokeId)
        ]);
        content.innerHTML = renderEncounterContent(pokeId, encounters, config);
        content.dataset.loaded = 'true';
    } catch (error) {
        console.warn('Localizacoes indisponiveis:', error);
        content.innerHTML = renderEncounterFallback();
    }
}

function loadEncounterConfig() {
    if (!encounterConfigPromise) {
        if (window.ENCOUNTER_CONFIG) {
            encounterConfigPromise = Promise.resolve(window.ENCOUNTER_CONFIG);
        } else {
            const cached = readCachedStorage(STORAGE.encounterConfig, CACHE_TTL.encounters);
            encounterConfigPromise = Promise.resolve(cached || {
                versionToRegion: {}, versionToGen: {}, regionDisplayOrder: [],
                versionDisplayOrder: [], versionDisplayNames: {}, starterPokemonIds: [],
                methodTranslations: {}, locationTermTranslations: {}, placeSuffixTranslations: {},
                nonWildMethods: ['gift', 'gift-egg', 'only-one', 'event', 'roaming']
            });
        }
    }
    return encounterConfigPromise;
}

async function loadEncounters(pokeId) {
    if (encounterCache.has(pokeId)) return encounterCache.get(pokeId);
    const key = `${STORAGE.encounters}${pokeId}`;
    const cached = readCachedStorage(key, CACHE_TTL.encounters);
    if (Array.isArray(cached)) {
        encounterCache.set(pokeId, cached);
        return cached;
    }

    const encounters = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${pokeId}/encounters`, { timeout: 6000, cache: false });
    encounterCache.set(pokeId, encounters);
    writeCachedStorage(key, encounters, CACHE_LIMITS.encounters);
    return encounters;
}

function renderEncounterContent(pokeId, encounters, config) {
    const methods = collectEncounterMethods(encounters);
    const starterIds = new Set(config.starterPokemonIds || []);

    if (!encounters.length || !hasWildMethod(methods, config)) {
        return renderNoWildInfo(pokeId, methods, config, starterIds);
    }

    const groups = groupEncounters(encounters, config);
    const rendered = Object.values(groups)
        .sort((a, b) => a.order - b.order)
        .map(group => renderEncounterGroup(group, config))
        .join('');

    return rendered || renderNoWildInfo(pokeId, methods, config, starterIds);
}

function collectEncounterMethods(encounters) {
    const methods = new Set();
    encounters.forEach(encounter => {
        encounter.version_details.forEach(versionDetail => {
            versionDetail.encounter_details.forEach(detail => {
                if (detail.method && detail.method.name) methods.add(detail.method.name);
            });
        });
    });
    return methods;
}

function hasWildMethod(methods, config) {
    const nonWild = new Set(config.nonWildMethods || []);
    return [...methods].some(method => !nonWild.has(method));
}

function renderNoWildInfo(pokeId, methods, config, starterIds) {
    const isStarter = starterIds.has(pokeId);
    const title = isStarter ? 'Linha de Pokemon inicial' : 'Sem encontro selvagem comum';
    const detail = isStarter
        ? 'Normalmente obtido como inicial, por evolucao, presente ou troca.'
        : 'Verifique evolucao, troca, presente, evento ou transferencia entre jogos.';
    const tags = methods.size
        ? [...methods].slice(0, 4).map(method => `<span class="method-tag">${escapeHtml(formatEncounterMethod(method, config))}</span>`).join('')
        : '<span class="method-tag">Metodo especial</span>';

    return `
        <div class="special-obtain-card">
            <div class="special-obtain-icon">★</div>
            <div class="special-obtain-body">
                <h4>${escapeHtml(title)}</h4>
                <p>${escapeHtml(detail)}</p>
                <div class="special-obtain-methods">
                    <span class="special-method-label">Como obter:</span>
                    ${tags}
                </div>
            </div>
        </div>
    `;
}

function groupEncounters(encounters, config) {
    const groups = {};
    const regionOrder = config.regionDisplayOrder || [];

    encounters.forEach(encounter => {
        encounter.version_details.forEach(versionDetail => {
            const version = versionDetail.version.name;
            const region = (config.versionToRegion || {})[version] || 'Outra';
            const group = groups[region] || (groups[region] = {
                region,
                versions: new Set(),
                locations: new Map(),
                order: regionOrder.includes(region) ? regionOrder.indexOf(region) : 99
            });
            group.versions.add(version);

            const area = encounter.location_area.name;
            const summary = summarizeEncounterDetails(versionDetail.encounter_details);
            const current = group.locations.get(area) || { area, versions: new Set(), methods: new Set(), minLv: 999, maxLv: 0, chance: 0 };
            current.versions.add(version);
            summary.methods.forEach(method => current.methods.add(method));
            current.minLv = Math.min(current.minLv, summary.minLv);
            current.maxLv = Math.max(current.maxLv, summary.maxLv);
            current.chance = Math.max(current.chance, summary.chance);
            group.locations.set(area, current);
        });
    });

    return groups;
}

function summarizeEncounterDetails(details) {
    return details.reduce((summary, detail) => {
        summary.minLv = Math.min(summary.minLv, detail.min_level);
        summary.maxLv = Math.max(summary.maxLv, detail.max_level);
        summary.chance = Math.max(summary.chance, detail.chance);
        if (detail.method && detail.method.name) summary.methods.add(detail.method.name);
        return summary;
    }, { methods: new Set(), minLv: 999, maxLv: 0, chance: 0 });
}

function renderEncounterGroup(group, config) {
    const versions = [...group.versions].sort((a, b) => getVersionOrder(a, config) - getVersionOrder(b, config));
    const locations = [...group.locations.values()]
        .sort((a, b) => (b.chance - a.chance) || (a.minLv - b.minLv))
        .slice(0, 3);
    const gen = (config.versionToGen || {})[versions[0]] || '';

    return `
        <div class="encounter-game-group">
            <div class="encounter-game-header">
                <span class="region-label">${escapeHtml(group.region)}</span>
                <span class="gen-label">(${escapeHtml(gen)})</span>
                <div class="version-badges">${renderVersionBadges(versions, config)}</div>
            </div>
            <div class="encounter-locations-list">
                ${locations.map(location => renderLocationCard(location, group.region, config)).join('')}
                ${group.locations.size > locations.length ? '<div class="encounter-limit-note">Mostrando os 3 locais mais uteis desta regiao.</div>' : ''}
            </div>
        </div>
    `;
}

function renderVersionBadges(versions, config) {
    return versions.slice(0, 6).map(version => {
        const label = (config.versionDisplayNames || {})[version] || displayName(version);
        return `<span class="version-badge v-default">${escapeHtml(label)}</span>`;
    }).join('') + (versions.length > 6 ? `<span class="version-badge v-default">+${versions.length - 6}</span>` : '');
}

function renderLocationCard(location, region, config) {
    const min = Number.isFinite(location.minLv) && location.minLv < 999 ? location.minLv : '?';
    const max = Number.isFinite(location.maxLv) && location.maxLv > 0 ? location.maxLv : '?';
    const level = min === max ? min : `${min}-${max}`;
    const chance = location.chance > 0 ? `${location.chance}%` : 'Variavel';
    const methods = [...location.methods].slice(0, 2).map(method => `<span class="method-tag">${escapeHtml(formatEncounterMethod(method, config, location.area))}</span>`).join('');
    return `
        <div class="encounter-loc-card">
            <div class="encounter-loc-name">${escapeHtml(formatLocationName(location.area, region, config))}</div>
            <div class="encounter-loc-details"><span><strong>Nv.</strong> ${level}</span><span><strong>Chance</strong> ${chance}</span></div>
            <div class="encounter-loc-methods">${methods}</div>
        </div>
    `;
}

function renderEncounterFallback() {
    const href = 'https://pokemondb.net/pokedex/national';
    return `
        <div class="encounter-empty">
            <p>As localizacoes externas nao responderam a tempo.</p>
            <a class="encounter-db-link" href="${href}" target="_blank" rel="noopener noreferrer">Abrir localizacoes no Pokemon Database</a>
        </div>
    `;
}

function exportToExcelHTML() {
    const rows = Array.from({ length: TOTAL_BOXES }, (_, boxIndex) => (
        Array.from({ length: BOX_ROWS }, (_, rowIndex) => (
            Array.from({ length: BOX_COLS }, (_, colIndex) => pokemonData[boxIndex * PER_BOX + rowIndex * BOX_COLS + colIndex] || null)
        ))
    ));
    const tables = rows.map((boxRows, boxIndex) => `
        <table>
            <thead><tr><th colspan="${BOX_COLS}">Box ${boxIndex + 1}</th></tr></thead>
            <tbody>${boxRows.map(row => `<tr>${row.map(poke => `<td>${poke ? `${poke.dexLabel}<br>${poke.label}` : ''}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
    `).join('<br>');
    const html = `<html><head><meta charset="UTF-8"><style>td{border:1px solid #ccc;text-align:center;height:50px}th{background:#10b981;color:white}</style></head><body>${tables}</body></html>`;
    downloadBlob(new Blob([html], { type: 'application/vnd.ms-excel' }), 'Pokemon_PC_Boxes.xls');
}

function exportChecklistToCSV() {
    const rows = ['id;name;captured', ...pokemonData.map(poke => `${poke.id};${poke.label};${capturedPokemon.has(poke.id) ? 1 : 0}`)];
    downloadBlob(new Blob([`\uFEFF${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' }), 'Pokemon_Living_Dex_Checklist.csv');
}

function openChecklistImport() {
    dom.importInput.click();
}

async function importChecklistCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const imported = parseChecklistCSV(await file.text());
        if (!imported) throw new Error('Invalid CSV.');
        capturedPokemon = imported;
        checklistSelection.clear();
        saveCapturedPokemon();
        renderChecklist();
    } catch (error) {
        alert('Nao foi possivel importar este CSV da checklist.');
    } finally {
        event.target.value = '';
    }
}

function parseChecklistCSV(csv) {
    const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    const columns = (lines.shift() || '').split(';').map(col => col.trim().toLowerCase());
    const idIndex = columns.indexOf('id');
    const capturedIndex = columns.indexOf('captured');
    if (idIndex === -1 || capturedIndex === -1) return null;

    const imported = new Set();
    let validRows = 0;
    lines.forEach(line => {
        const values = line.split(';');
        const id = Number(values[idIndex]);
        if (!Number.isInteger(id) || id < 1 || id > TOTAL_POKEMON) return;
        validRows++;
        if ((values[capturedIndex] || '').trim() === '1') imported.add(id);
    });
    return validRows ? imported : null;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

async function fetchJson(url, { timeout = 6000, cache = true } = {}) {
    if (!isTrustedPokeApiUrl(url)) throw new Error('Origem de dados nao confiavel.');
    const key = cache ? `${STORAGE.api}${url}` : '';
    if (key) {
        const cached = readCachedStorage(key, CACHE_TTL.api);
        if (cached !== null) return cached;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
        const data = await response.json();
        if (key) writeCachedStorage(key, data, CACHE_LIMITS.api);
        return data;
    } finally {
        clearTimeout(timeoutId);
    }
}

function getEvolutionInfo(chain) {
    const rows = [];
    collectEvolutionPaths(chain, []).forEach(path => {
        if (path.length < 2) return;
        let html = '';
        path.forEach((node, index) => {
            if (index > 0) html += `<div class="evo-connector"><span class="evo-method">${escapeHtml(node.method || 'Evolucao')}</span><span class="evo-arrow">→</span></div>`;
            html += `<div class="evo-poke" role="button" tabindex="0" data-action="open-pokemon" data-poke-id="${node.id}"><img src="${officialSprite(node.id)}" data-fallback-src="${smallSprite(node.id)}" decoding="async" alt="${escapeHtml(node.name)}"><span class="evo-dex">${formatId(node.id)}</span><span class="evo-name">${escapeHtml(displayName(node.name))}</span></div>`;
        });
        rows.push(`<div class="evo-chain-row">${html}</div>`);
    });
    return [...new Set(rows)];
}

function collectEvolutionPaths(node, path) {
    const current = {
        id: extractId(node.species.url),
        name: node.species.name,
        method: path.length ? formatEvolutionMethod(node.evolution_details || []) : ''
    };
    const nextPath = [...path, current];
    if (!node.evolves_to || !node.evolves_to.length) return [nextPath];
    return node.evolves_to.flatMap(next => collectEvolutionPaths(next, nextPath));
}

function formatEvolutionMethod(details) {
    const detail = details[0] || {};
    if (detail.min_level) return `Nivel ${detail.min_level}`;
    if (detail.item) return `Usar ${displayName(detail.item.name)}`;
    if (detail.trigger && detail.trigger.name === 'trade') return 'Troca';
    if (detail.min_happiness) return `Felicidade ${detail.min_happiness}+`;
    return detail.trigger ? displayName(detail.trigger.name) : 'Evolucao';
}

function pickLocalizedText(entries = [], getText) {
    const preferred = entries.find(entry => entry.language.name === 'pt-br')
        || entries.find(entry => entry.language.name === 'pt')
        || entries.find(entry => entry.language.name === 'en')
        || entries[0];
    return preferred
        ? {
            text: getText(preferred).replace(/\f/g, ' ').replace(/\s+/g, ' ').trim(),
            language: preferred.language ? preferred.language.name : ''
        }
        : { text: '', language: '' };
}

function getSpeciesRegion(species) {
    const genNumber = extractId(species.generation.url);
    const generation = generationRanges[genNumber - 1];
    const region = generation ? generation.region : 'regiao nao informada';
    return `${displayName(species.name)} normalmente e associado a ${region}, dentro da ${genNumber || '?'}ª geracao.`;
}

function formatEncounterMethod(method, config, areaName = '') {
    if (areaName.includes('friend-safari')) return 'Friend Safari';
    return (config.methodTranslations || {})[method] || displayName(method);
}

function getVersionOrder(version, config) {
    const order = config.versionDisplayOrder || [];
    const index = order.indexOf(version);
    return index === -1 ? 999 : index;
}

function formatLocationName(areaName, region, config) {
    const terms = config.locationTermTranslations || {};
    const suffixes = config.placeSuffixTranslations || {};
    const clean = areaName.replace(/-area$/, '').replace(new RegExp(`^${escapeRegex(region.toLowerCase())}-`, 'i'), '');
    const route = clean.match(/^route-(\d+)/);
    if (route) return `Rota ${route[1]}`;
    if (clean.startsWith('friend-safari')) return formatFriendSafariName(clean, terms);

    const parts = clean.split('-').filter(Boolean);
    const suffix = parts[parts.length - 1];
    if (suffixes[suffix] && parts.length > 1) {
        return `${suffixes[suffix]} ${parts.slice(0, -1).map(part => formatLocationPart(part, terms)).join(' ')}`;
    }
    return parts.map(part => formatLocationPart(part, terms)).join(' ');
}

function formatFriendSafariName(areaName, terms) {
    const safariType = areaName.replace(/^friend-safari-?/, '');
    if (!safariType) return 'Friend Safari';
    return `Friend Safari (${formatLocationPart(safariType, terms)})`;
}

function formatLocationPart(part, terms) {
    return terms[part] || displayName(part);
}

function spriteAttrs(poke) {
    return `src="${poke.sprite}" data-fallback-src="${poke.fallbackSprite}" decoding="async" alt="${escapeHtml(poke.name)}"`;
}

function useFallbackSprite(img) {
    if (img.dataset.fallbackSrc && img.src !== img.dataset.fallbackSrc) img.src = img.dataset.fallbackSrc;
}

function handleSpriteError(event) {
    if (event.target instanceof HTMLImageElement && event.target.dataset.fallbackSrc) useFallbackSprite(event.target);
}

function isTrustedPokeApiUrl(url) {
    return typeof url === 'string' && url.startsWith(TRUSTED_POKEAPI_PREFIX);
}

function officialSprite(id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function smallSprite(id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function renderPokemonDatabaseLink(poke) {
    return `<a class="pokemon-db-link" href="https://pokemondb.net/pokedex/${poke.name}" target="_blank" rel="noopener noreferrer" title="Abrir ${displayName(poke.name)} no Pokemon Database"><span>Pokemon Database</span><span aria-hidden="true">&nearr;</span></a>`;
}

function formatId(id) {
    return `#${String(id).padStart(3, '0')}`;
}

function displayName(name = '') {
    return name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function extractId(url = '') {
    return Number(url.split('/').filter(Boolean).pop()) || 0;
}

function getVisibleTabStart(boxIndex, boxCount) {
    return Math.min(Math.floor(boxIndex / TABS_PER_PAGE) * TABS_PER_PAGE, Math.max(0, boxCount - TABS_PER_PAGE));
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

function debounce(callback, delay) {
    let timeoutId = null;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => callback(...args), delay);
    };
}

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(text = '') {
    return String(text).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function readStorage(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || 'null');
    } catch (error) {
        return null;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
    }
}

function readCachedStorage(key, maxAge) {
    const cached = readStorage(key);
    if (!cached || typeof cached !== 'object' || !Number.isFinite(cached.savedAt) || !Object.prototype.hasOwnProperty.call(cached, 'value')) return null;
    if (Date.now() - cached.savedAt > maxAge) {
        try { localStorage.removeItem(key); } catch (error) { }
        return null;
    }
    return cached.value;
}

function writeCachedStorage(key, value, maxEntries = 0) {
    if (maxEntries) pruneCache(key.substring(0, key.lastIndexOf(':') + 1), maxEntries - 1);
    writeStorage(key, { savedAt: Date.now(), value });
}

function pruneCache(prefix, maxEntries) {
    try {
        const entries = [];
        for (let index = 0; index < localStorage.length; index++) {
            const key = localStorage.key(index);
            if (!key || !key.startsWith(prefix)) continue;
            const cached = readStorage(key);
            entries.push({ key, savedAt: Number(cached && cached.savedAt) || 0 });
        }
        entries.sort((a, b) => a.savedAt - b.savedAt);
        while (entries.length > maxEntries) localStorage.removeItem(entries.shift().key);
    } catch (error) {
    }
}
