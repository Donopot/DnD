"""Phase 49: Générateur de PNJ — noms, traits, apparence, secrets."""

import random
import secrets as crypto_random

# ── Tables de données ──────────────────────────────────────────────────────

RACES = [
    "Humain", "Elfe", "Nain", "Halfelin", "Gnome",
    "Demi-elfe", "Demi-orc", "Tieffelin", "Dragonné",
]

GENRES = ["Masculin", "Féminin", "Non-binaire"]

# ruff: noqa: E501 — name data arrays below have legitimate long lines
NOMS = {
    "Humain": {
        "Masculin": ["Aldric", "Cedric", "Darian", "Edmund", "Garret", "Hugo", "Lothar", "Merek", "Orin", "Percival", "Roderick", "Theobald", "Ulric", "Victor", "Willem"],
        "Féminin": ["Alys", "Beatrice", "Cecily", "Elena", "Gwen", "Isolde", "Lianna", "Margot", "Rosalind", "Seraphina", "Tessa", "Yvaine"],
        "Non-binaire": ["Ariel", "Caelan", "Darian", "Ellis", "Kai", "Morgan", "Quinn", "Ren", "Sage", "Val"],
    },
    "Elfe": {
        "Masculin": ["Aelar", "Elrond", "Felaern", "Ilphas", "Laeron", "Myrin", "Nylas", "Orist", "Sylas", "Theron", "Vaelin", "Zylrien"],
        "Féminin": ["Aeris", "Caelynn", "Elara", "Faenys", "Ilyana", "Lirael", "Miralys", "Naevys", "Sylphine", "Thalia", "Valyra", "Yllawen"],
        "Non-binaire": ["Aeris", "Caelum", "Ilian", "Lareth", "Myrin", "Sylvan", "Vaeril", "Zephyr"],
    },
    "Nain": {
        "Masculin": ["Balin", "Dain", "Durin", "Farin", "Gimli", "Gloin", "Kazador", "Morgrim", "Orin", "Rurik", "Thorin", "Torvin"],
        "Féminin": ["Arna", "Brynhild", "Dagmar", "Eldeth", "Gerta", "Helga", "Ingrid", "Kathra", "Sigrid", "Thyra", "Yrsa"],
        "Non-binaire": ["Bryn", "Dain", "Korg", "Magni", "Ragna", "Sten", "Torvald"],
    },
    "Halfelin": {
        "Masculin": ["Alton", "Corrin", "Dell", "Errich", "Finnan", "Garret", "Lyle", "Merric", "Milo", "Ned", "Perrin", "Reed"],
        "Féminin": ["Andry", "Bree", "Cora", "Euphemia", "Jillian", "Lavinia", "Lidda", "Merla", "Nyx", "Portia", "Seraphina", "Verna"],
        "Non-binaire": ["Cory", "Finley", "Merry", "Riley", "Robin", "Shiloh", "Tavi"],
    },
    "Gnome": {
        "Masculin": ["Alvyn", "Boddynock", "Dimble", "Eldon", "Frug", "Gimble", "Namfoodle", "Orryn", "Roondar", "Sindri", "Tock", "Zook"],
        "Féminin": ["Banxi", "Carlin", "Ellywick", "Jelenneth", "Lilli", "Loopmottin", "Mardnab", "Roywyn", "Shamil", "Tana", "Zanna"],
        "Non-binaire": ["Bimpnottin", "Cade", "Fizz", "Jinx", "Nix", "Sprocket", "Tink"],
    },
    "Demi-elfe": {
        "Masculin": ["Aelar", "Darian", "Eldrin", "Finn", "Hadrian", "Keth", "Lorien", "Rhys", "Thalion", "Varian"],
        "Féminin": ["Aeris", "Caelynn", "Eira", "Keyleth", "Lianna", "Nerys", "Sylphine", "Tessara", "Val"],
        "Non-binaire": ["Caelan", "Ellis", "Kai", "Morgan", "Quinn", "Ren", "Sage", "Val"],
    },
    "Demi-orc": {
        "Masculin": ["Braku", "Dorn", "Garog", "Hruk", "Karash", "Morg", "Ragar", "Thokk", "Ulgar", "Zarg"],
        "Féminin": ["Barka", "Dura", "Greshka", "Hagra", "Kansif", "Morra", "Rogga", "Vola"],
        "Non-binaire": ["Dorn", "Karn", "Morg", "Rath", "Skarr", "Thokk"],
    },
    "Tieffelin": {
        "Masculin": ["Akmenos", "Cairn", "Damakos", "Ekemon", "Iados", "Kairon", "Leucis", "Melech", "Morthos", "Pelius", "Skamos", "Zairon"],
        "Féminin": ["Akta", "Anakis", "Bryseis", "Criella", "Damaia", "Ea", "Kallista", "Lerissa", "Makaria", "Nemeia", "Orianna", "Phelaia", "Rieta"],
        "Non-binaire": ["Cairn", "Lyris", "Morthos", "Raziel", "Sariel", "Zephon"],
    },
    "Dragonné": {
        "Masculin": ["Arjhan", "Balasar", "Bharash", "Donaar", "Ghesh", "Kriv", "Medrash", "Nadarr", "Pandjed", "Torinn", "Ugin"],
        "Féminin": ["Akra", "Biri", "Daar", "Harann", "Jheri", "Kava", "Korinn", "Perra", "Sora", "Thava", "Vera"],
        "Non-binaire": ["Ash", "Clax", "Kurn", "Ophir", "Rath", "Skaas", "Torinn"],
    },
}

APPARENCES = {
    "taille": ["Très petit", "Petit", "Dans la moyenne", "Grand", "Très grand", "Imposant"],
    "carrure": ["Frêle", "Svelte", "Athlétique", "Trapu", "Corpulent", "Musculeux", "Décharné"],
    "cheveux": ["Noirs", "Bruns", "Blonds", "Roux", "Blancs", "Gris", "Chauve", "Rasés", "Longs et tressés", "En bataille"],
    "yeux": ["Noirs", "Marron", "Bleus", "Verts", "Gris", "Noisette", "Vairons", "Ambrés", "Pâles", "Perçants"],
    "peau": ["Claire", "Mate", "Bronzée", "Sombre", "Pâle", "Tannée", "Cicatrisée", "Tatouée"],
    "signe_distinctif": [
        "Cicatrice sur la joue gauche", "Tatouage tribal sur le bras", "Doigts tachés d'encre",
        "Bijou familial toujours porté", "Tic nerveux à l'œil", "Boite légèrement",
        "Parle avec un accent prononcé", "Sent le tabac et le cuir", "Rit trop fort",
        "Regarde toujours par-dessus son épaule", "Mordille sa lèvre en réfléchissant",
        "Porte un manteau usé mais propre", "Tousse fréquemment", "A un rire communicatif",
        "A toujours un carnet à la main", "Manipule constamment une pièce de monnaie",
        "A les jointures abîmées", "Porte une plume d'oiseau rare aux cheveux",
        "Cache ses mains dans ses manches",
    ],
}

OCCUPATIONS = [
    "Forgeron", "Alchimiste", "Taverner", "Marchand itinérant", "Garde de la ville",
    "Paysan", "Pécheur", "Chasseur", "Herboriste", "Apothicaire",
    "Prêtre", "Moine", "Érudit", "Bibliothécaire", "Cartographe",
    "Ménestrel", "Barde ambulant", "Voleur repenti", "Mercenaire", "Contrebandier",
    "Capitaine de navire", "Marin", "Explorateur", "Guide de montagne",
    "Noble désargenté", "Courtisan", "Diplomate", "Espion", "Messager",
    "Cuisinier", "Boulanger", "Brasseur", "Tanneur", "Tisserand",
    "Bijoutier", "Enchanteur", "Ingénieur gnome", "Dresseur de créatures",
    "Fossoyeur", "Bourreau", "Chasseur de primes", "Inquisiteur à la retraite",
]

PERSONNALITES = [
    "Optimiste et naïf", "Cynique et blasé", "Généreux jusqu'à la bêtise",
    "Méfiant envers les étrangers", "Curieux de tout", "Paresseux mais débrouillard",
    "Loyal jusqu'à la mort", "Manipulateur et charmeur", "Honnête jusqu'à l'excès",
    "Impulsif et colérique", "Calme et réfléchi", "Excentrique et imprévisible",
    "Taciturne et observateur", "Bavard intarissable", "Romantique désespéré",
    "Pragmatique et terre-à-terre", "Idéaliste passionné", "Rancunier tenace",
    "Protecteur presque étouffant", "Détaché, presque indifférent",
]

IDEAUX = [
    "La liberté avant tout", "La connaissance est le vrai pouvoir",
    "Protéger les innocents", "La richesse ouvre toutes les portes",
    "L'honneur guide mes pas", "La nature doit être préservée",
    "L'art et la beauté sauveront le monde", "L'ordre doit régner en toutes choses",
    "Le peuple mérite mieux que ses dirigeants", "Ma parole est ma vie",
    "La vengeance est un plat qui se mange froid", "L'aventure est le sel de la vie",
    "Le pouvoir corrompt, je le sais bien", "L'amour vainc tout",
    "La tradition est sacrée", "Le progrès avant tout",
]

LIENS = [
    "Protège un secret de famille dangereux",
    "Doit une dette à une personne puissante",
    "Cherche un artefact perdu depuis des siècles",
    "Veut retrouver un proche disparu",
    "Protège un enfant qui n'est pas le sien",
    "Est lié par serment à une guilde",
    "Cache sa véritable identité",
    "Doit prouver son innocence pour un crime",
    "Est le dernier gardien d'une tradition oubliée",
    "Possède une carte menant à un trésor légendaire",
    "S'est lié d'amitié avec une créature étrange",
    "Entretient une correspondance secrète",
    "Appartient à une famille noble déchue",
    "A escroqué la mauvaise personne",
    "Fuit un mariage arrangé",
]

DEFAUTS = [
    "Trop fier pour demander de l'aide",
    "Ne peut pas résister à un joli visage",
    "Avare — chaque pièce compte",
    "Parle avant de réfléchir",
    "A peur du noir / des espaces clos / des hauteurs",
    "Addict aux jeux d'argent",
    "Boit plus que de raison",
    "Collectionne les objets inutiles",
    "Ne fait jamais confiance — même à ses alliés",
    "Prend des risques insensés pour prouver sa valeur",
    "Ment par réflexe, même sans raison",
    "Superstitieux à l'extrême",
    "Juge les gens sur l'apparence",
    "Ne supporte pas la critique",
    "Garde rancune pour des offenses mineures",
]

MANIERISMES = [
    "Parle d'une voix douce, presque un murmure",
    "Voix grave et autoritaire",
    "Parle très vite, s'emballe facilement",
    "Cherche ses mots, fait de longues pauses",
    "Accent campagnard prononcé",
    "Voix rauque de fumeur",
    "Termine ses phrases par 'n'est-ce pas ?'",
    "Parle de lui à la 3ᵉ personne",
    "Répète souvent 'tu vois ?'",
    "Ponctue ses phrases de proverbes",
    "Glousse nerveusement",
    "Tousse pour gagner du temps",
    "Joue avec sa barbe / ses cheveux en parlant",
    "Garde toujours un œil sur la porte",
    "Évite le contact visuel",
    "Soutient le regard de façon intimidante",
]

SECRETS = [
    "A tué quelqu'un par accident et cache le corps",
    "Est en réalité un noble en exil",
    "Sait lire et écrire — le cache par peur",
    "A un enfant illégitime dans une autre ville",
    "A volé l'identité d'une personne décédée",
    "A conclu un pacte avec une entité obscure",
    "Est recherché par une guilde d'assassins",
    "A trahi son ancien groupe d'aventuriers",
    "Possède un pouvoir magique latent qu'il ne contrôle pas",
    "A découvert un complot contre le roi",
    "Est le seul survivant d'une malédiction familiale",
    "A enterré une fortune en pièces d'or dans la forêt",
    "S'est évadé de prison il y a des années",
    "Peut parler aux morts mais personne ne le sait",
    "A déjà vu l'avenir en rêve — et il est terrifiant",
]


def _pick(table):
    return table[crypto_random.randbelow(len(table))]


def _pick_name(race: str, genre: str) -> str:
    names = NOMS.get(race, NOMS["Humain"])
    gendered = names.get(genre, names[next(iter(names.keys()))])
    return _pick(gendered)


def generate_npc() -> dict:
    race = _pick(RACES)
    genre = _pick(GENRES)
    name = _pick_name(race, genre)

    age = random.randint(16, 80) if race != "Elfe" else random.randint(30, 500)
    if race == "Nain":
        age = random.randint(30, 250)

    apparence = {k: _pick(v) for k, v in APPARENCES.items()}
    occupation = _pick(OCCUPATIONS)
    personnalite = _pick(PERSONNALITES)
    ideal = _pick(IDEAUX)
    lien = _pick(LIENS)
    defaut = _pick(DEFAUTS)
    manierisme = _pick(MANIERISMES)
    secret = _pick(SECRETS)

    return {
        "race": race,
        "genre": genre,
        "nom": name,
        "age": age,
        "apparence": apparence,
        "occupation": occupation,
        "personnalite": personnalite,
        "ideal": ideal,
        "lien": lien,
        "defaut": defaut,
        "manierisme": manierisme,
        "secret": secret,
    }
