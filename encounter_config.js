// Geração codificada: "3" = "3ª Geração", "3R" = "3ª Geração (Remake)"
function expandGen(code) {
  const remake = code.endsWith('R');
  const num = parseInt(code);
  return `${num}ª Geração${remake ? ' (Remake)' : ''}`;
}

// Versões: { 'região|gen': 'slug:Display, ...' }
const versionGroups = {
  'Kanto|1':  'red:Red,blue:Blue,yellow:Yellow,red-japan:Red (JP),green-japan:Green (JP),blue-japan:Blue (JP)',
  'Kanto|3R': 'firered:FireRed,leafgreen:LeafGreen',
  'Kanto|7R': "lets-go-pikachu:Let's Go Pikachu,lets-go-eevee:Let's Go Eevee",
  'Johto|2':  'gold:Gold,silver:Silver,crystal:Crystal',
  'Johto|4R': 'heartgold:HeartGold,soulsilver:SoulSilver',
  'Hoenn|3':  'ruby:Ruby,sapphire:Sapphire,emerald:Emerald',
  'Hoenn|6R': 'omega-ruby:Omega Ruby,alpha-sapphire:Alpha Sapphire',
  'Orre|3':   'colosseum:Colosseum,xd:XD',
  'Sinnoh|4': 'diamond:Diamond,pearl:Pearl,platinum:Platinum',
  'Sinnoh|8R':'brilliant-diamond:Brilliant Diamond,shining-pearl:Shining Pearl',
  'Unova|5':  'black:Black,white:White,black-2:Black 2,white-2:White 2',
  'Kalos|6':  'x:X,y:Y',
  'Alola|7':  'sun:Sun,moon:Moon,ultra-sun:Ultra Sun,ultra-moon:Ultra Moon',
  'Galar|8':  'sword:Sword,shield:Shield',
  'Hisui|8':  'legends-arceus:Legends: Arceus'
};

// Expande tudo automaticamente
const versionToRegion = {}, versionToGen = {}, versionDisplayNames = {}, versionDisplayOrder = [];
Object.entries(versionGroups).forEach(([key, games]) => {
  const [region, genCode] = key.split('|');
  const gen = expandGen(genCode);
  games.split(',').forEach(g => {
    const [slug, display] = g.split(':');
    versionToRegion[slug] = region;
    versionToGen[slug] = gen;
    versionDisplayNames[slug] = display;
    versionDisplayOrder.push(slug);
  });
});

// Starters: 3 linhas evolutivas × 8 gerações (IDs iniciais, 9 pokémon cada)
const starterPokemonIds = [1,152,252,387,495,650,722,810].flatMap(s => Array.from({ length: 9 }, (_, i) => s + i));

// Traduções de localização (placeSuffix derivado automaticamente)
const locationTerms = {
  route: 'Rota', area: 'Área', city: 'Cidade', town: 'Vila',
  forest: 'Floresta', cave: 'Caverna', tower: 'Torre', lake: 'Lago',
  road: 'Estrada', park: 'Parque', valley: 'Vale', desert: 'Deserto',
  island: 'Ilha', mount: 'Monte', mt: 'Monte', safari: 'Safári',
  zone: 'Zona', north: 'norte', south: 'sul', east: 'leste',
  west: 'oeste', towards: 'em direção a', outside: 'lado de fora', inside: 'interior',
  friend: 'Amigo', water: 'Água', grass: 'Grama', fire: 'Fogo',
  electric: 'Elétrico', steel: 'Metal', ice: 'Gelo', flying: 'Voador',
  dark: 'Sombrio', fighting: 'Lutador', poison: 'Veneno', dragon: 'Dragão',
  fairy: 'Fada', bug: 'Inseto', ghost: 'Fantasma', psychic: 'Psíquico',
  normal: 'Normal', rock: 'Pedra', ground: 'Terrestre',
  village: 'Vila', bridge: 'Ponte', ruins: 'Ruínas', garden: 'Jardim',
  tunnel: 'Túnel', mansion: 'Mansão', sea: 'Mar', river: 'Rio',
  pond: 'Lago', hill: 'Colina', mountain: 'Montanha', coast: 'Costa',
  beach: 'Praia', cliff: 'Penhasco', meadow: 'Prado', swamp: 'Pântano',
  marsh: 'Pântano', mine: 'Mina', gate: 'Portão', harbor: 'Porto',
  plaza: 'Praça', field: 'Campo', trail: 'Trilha', path: 'Caminho',
  woods: 'Bosque', pokemon: 'Pokémon', upper: 'superior', lower: 'inferior',
  basement: 'subsolo', floor: 'andar'
};
const placeSuffixes = ['city','town','forest','cave','tower','lake','road','park','valley','desert','island','zone','village','bridge','ruins','garden','tunnel','mansion','meadow','marsh','swamp','mine','beach','coast','hill','mountain','plaza','field','woods'];

window.ENCOUNTER_CONFIG = {
  versionToRegion, versionToGen, versionDisplayOrder, versionDisplayNames,
  regionDisplayOrder: ['Kanto','Johto','Hoenn','Orre','Sinnoh','Unova','Kalos','Alola','Galar','Hisui','Outra'],
  starterPokemonIds,
  methodTranslations: {
    walk: 'Andando na grama', surf: 'Surfando',
    'old-rod': 'Pescando (Vara Velha)', 'good-rod': 'Pescando (Vara Boa)', 'super-rod': 'Pescando (Super Vara)',
    'rock-smash': 'Quebrando pedras', headbutt: 'Headbutt em árvores',
    gift: 'Presente/Doação', 'only-one': 'Único (Lendário/Especial)',
    pokeflute: 'Usando Pokéflauta', 'sos-encounter': 'Chamada SOS',
    overworld: 'No overworld', 'overworld-special': 'No overworld (especial)',
    'colosseum-bonus-disc-jpn': 'Disco Bônus Colosseum (JP)',
    'dark-grass': 'Grama escura', 'tall-grass': 'Grama alta',
    'grass-pokemon-let-s-go': 'Grama (Let\'s Go)', 'rough-terrain': 'Terreno acidentado',
    'roaming-grass': 'Errante (grama)', 'roaming-water': 'Errante (água)',
    'cave-spots': 'Pontos na caverna', 'bridge-spots': 'Pontos na ponte',
    'fishing-spots': 'Pontos de pesca',
    'yellow-flowers': 'Flores amarelas', 'purple-flowers': 'Flores roxas', 'red-flowers': 'Flores vermelhas'
  },
  locationTermTranslations: locationTerms,
  placeSuffixTranslations: Object.fromEntries(placeSuffixes.map(k => [k, locationTerms[k]])),
  nonWildMethods: ['gift', 'gift-egg', 'only-one', 'event', 'roaming']
};
