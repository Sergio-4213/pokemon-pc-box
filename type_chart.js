// Standard single-type matchups, Generation VI onward. Rows attack; columns defend.
// Source: https://sg.portal-pokemon.com/game/type-chart/
const MATCHUP_TYPES = [
    ['normal', 'Normal'], ['fighting', 'Lutador'], ['flying', 'Voador'],
    ['poison', 'Veneno'], ['ground', 'Terrestre'], ['rock', 'Pedra'],
    ['bug', 'Inseto'], ['ghost', 'Fantasma'], ['steel', 'Metal'],
    ['fire', 'Fogo'], ['water', 'Água'], ['grass', 'Grama'],
    ['electric', 'Elétrico'], ['psychic', 'Psíquico'], ['ice', 'Gelo'],
    ['dragon', 'Dragão'], ['dark', 'Sombrio'], ['fairy', 'Fada']
];

// Each entry lists double damage, half damage and no damage, respectively.
const TYPE_MATCHUPS = {
    normal: [[], ['rock', 'steel'], ['ghost']],
    fighting: [['normal', 'rock', 'steel', 'ice', 'dark'], ['flying', 'poison', 'bug', 'psychic', 'fairy'], ['ghost']],
    flying: [['fighting', 'bug', 'grass'], ['rock', 'steel', 'electric'], []],
    poison: [['grass', 'fairy'], ['poison', 'ground', 'rock', 'ghost'], ['steel']],
    ground: [['poison', 'rock', 'steel', 'fire', 'electric'], ['bug', 'grass'], ['flying']],
    rock: [['flying', 'bug', 'fire', 'ice'], ['fighting', 'ground', 'steel'], []],
    bug: [['grass', 'psychic', 'dark'], ['fighting', 'flying', 'poison', 'ghost', 'steel', 'fire', 'fairy'], []],
    ghost: [['ghost', 'psychic'], ['dark'], ['normal']],
    steel: [['rock', 'ice', 'fairy'], ['steel', 'fire', 'water', 'electric'], []],
    fire: [['bug', 'steel', 'grass', 'ice'], ['rock', 'fire', 'water', 'dragon'], []],
    water: [['ground', 'rock', 'fire'], ['water', 'grass', 'dragon'], []],
    grass: [['ground', 'rock', 'water'], ['flying', 'poison', 'bug', 'steel', 'fire', 'grass', 'dragon'], []],
    electric: [['flying', 'water'], ['grass', 'electric', 'dragon'], ['ground']],
    psychic: [['fighting', 'poison'], ['steel', 'psychic'], ['dark']],
    ice: [['flying', 'ground', 'grass', 'dragon'], ['steel', 'fire', 'water', 'ice'], []],
    dragon: [['dragon'], ['steel'], ['fairy']],
    dark: [['ghost', 'psychic'], ['fighting', 'dark', 'fairy'], []],
    fairy: [['fighting', 'dragon', 'dark'], ['poison', 'steel', 'fire'], []]
};

function typeEffectiveness(attacker, defender) {
    const [double, half, zero] = TYPE_MATCHUPS[attacker];
    return zero.includes(defender) ? 0 : double.includes(defender) ? 2 : half.includes(defender) ? 0.5 : 1;
}

const typeChartState = { ready: false, selected: 'fire', mode: 'defense' };

function typeChip(id, label) {
    return `<span class="matchup-chip matchup-${id}"><span class="type-swatch" aria-hidden="true"></span>${label}</span>`;
}

function initTypeChart() {
    if (typeChartState.ready) return;
    typeChartState.ready = true;
    const picker = document.getElementById('typePicker');
    picker.innerHTML = MATCHUP_TYPES.map(([id, label]) =>
        `<button type="button" class="type-choice" data-chart-type="${id}" aria-pressed="false" title="Selecionar ${label}">${typeChip(id, label)}</button>`
    ).join('');

    const matrix = document.getElementById('typeMatrix');
    matrix.insertAdjacentHTML('beforeend', `
        <thead><tr><th scope="col" class="matrix-corner">Ataque ↓<br>Defesa →</th>${MATCHUP_TYPES.map(([id, label]) =>
            `<th scope="col" data-defender="${id}"><button type="button" data-chart-type="${id}" data-chart-mode="defense" title="Defesa de ${label}">${label}</button></th>`
        ).join('')}</tr></thead>
        <tbody>${MATCHUP_TYPES.map(([attack, attackLabel]) => `<tr>
            <th scope="row" data-attacker="${attack}"><button type="button" data-chart-type="${attack}" data-chart-mode="attack" title="Ataque de ${attackLabel}">${typeChip(attack, attackLabel)}</button></th>
            ${MATCHUP_TYPES.map(([defend, defendLabel]) => {
                const value = typeEffectiveness(attack, defend);
                const kind = value === 2 ? 'double' : value === 0.5 ? 'half' : value === 0 ? 'zero' : 'normal';
                const text = value === 0.5 ? '½×' : `${value}×`;
                return `<td class="damage-${kind}" data-attack="${attack}" data-defend="${defend}" title="${attackLabel} contra ${defendLabel}: ${text}">${text}</td>`;
            }).join('')}
        </tr>`).join('')}</tbody>`);

    document.getElementById('typesPage').addEventListener('click', event => {
        const choice = event.target.closest('[data-chart-type], [data-type-mode]');
        if (!choice) return;
        if (choice.dataset.chartType) typeChartState.selected = choice.dataset.chartType;
        if (choice.dataset.chartMode) typeChartState.mode = choice.dataset.chartMode;
        if (choice.dataset.typeMode) typeChartState.mode = choice.dataset.typeMode;
        updateTypeChart();
    });
    updateTypeChart();
}

function updateTypeChart() {
    const { selected, mode } = typeChartState;
    const attackMode = mode === 'attack';
    const label = MATCHUP_TYPES.find(([id]) => id === selected)[1];
    document.querySelectorAll('#typePicker button').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.chartType === selected));
    });
    document.querySelectorAll('[data-type-mode]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.typeMode === mode));
    });

    const groups = attackMode
        ? [[2, 'Forte contra', 'Causa 2× de dano'], [0.5, 'Pouco eficaz contra', 'Causa metade do dano'], [0, 'Sem efeito contra', 'Não causa dano']]
        : [[2, 'Fraquezas', 'Recebe 2× de dano'], [0.5, 'Resistências', 'Recebe metade do dano'], [0, 'Imunidades', 'Não recebe dano']];
    document.getElementById('typeResults').innerHTML = `
        <h3>${label} · ${attackMode ? 'Ataque' : 'Defesa'}</h3>
        <div class="type-result-groups">${groups.map(([multiplier, title, subtitle]) => {
            const matches = MATCHUP_TYPES.filter(([other]) =>
                (attackMode ? typeEffectiveness(selected, other) : typeEffectiveness(other, selected)) === multiplier
            );
            return `<section class="type-result-group"><h4>${title}</h4><p>${subtitle}</p>
                <div class="type-result-chips">${matches.length ? matches.map(([id, name]) => typeChip(id, name)).join('') : '<span class="type-none">Nenhum tipo</span>'}</div>
            </section>`;
        }).join('')}</div>`;

    // Update only state classes; the 324 table cells are built once.
    document.querySelectorAll('#typeMatrix td').forEach(cell => {
        const relevant = attackMode ? cell.dataset.attack === selected : cell.dataset.defend === selected;
        cell.classList.toggle('matchup-highlight', relevant);
        cell.classList.toggle('matchup-muted', !relevant);
    });
    document.querySelectorAll('#typeMatrix th[data-attacker], #typeMatrix th[data-defender]').forEach(header => {
        const active = attackMode ? header.dataset.attacker === selected : header.dataset.defender === selected;
        header.classList.toggle('matchup-header-active', active);
        header.querySelector('button').setAttribute('aria-pressed', String(active));
    });
    const scroller = document.querySelector('.type-matrix-scroll');
    const selectedHeader = document.querySelector('#typeMatrix .matchup-header-active');
    const frame = scroller.getBoundingClientRect();
    const headerRect = selectedHeader.getBoundingClientRect();
    if (!attackMode && (headerRect.left < frame.left + 112 || headerRect.right > frame.right)) {
        scroller.scrollLeft += headerRect.left - frame.left - 112 - (frame.width - 112 - headerRect.width) / 2;
    }
    if (attackMode && (headerRect.top < frame.top + 44 || headerRect.bottom > frame.bottom)) {
        scroller.scrollTop += headerRect.top - frame.top - 44 - (frame.height - 44 - headerRect.height) / 2;
    }
}
