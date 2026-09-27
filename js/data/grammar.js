/*
 * Grammar reference cards. Short, static, hand-written content.
 * Block types: rule (text), table (head + rows), examples ([fr, en] pairs), tip (text).
 */
FV.GRAMMAR = [
  {
    id: 'articles', title: 'French Articles', group: 'Nouns & articles',
    summary: 'Every French noun usually comes with an article that shows gender and number.',
    blocks: [
      { type: 'table', head: ['', 'Masc.', 'Fem.', 'Plural'], rows: [
        ['Definite (the)', 'le / l\'', 'la / l\'', 'les'],
        ['Indefinite (a, some)', 'un', 'une', 'des'],
        ['Partitive (some)', 'du / de l\'', 'de la / de l\'', 'des'],
      ]},
      { type: 'examples', items: [['le livre, la table, les amis', 'the book, the table, the friends'], ['un chat, une maison', 'a cat, a house'], ['du pain, de la soupe', 'some bread, some soup']] },
      { type: 'tip', text: 'Learn every noun together with its article: "la table", not just "table".' },
    ],
  },
  {
    id: 'gender', title: 'Masculine vs Feminine', group: 'Nouns & articles',
    summary: 'All nouns are masculine or feminine. Some endings give strong clues.',
    blocks: [
      { type: 'table', head: ['Usually masculine', 'Usually feminine'], rows: [
        ['-age (le fromage)', '-tion / -sion (la nation)'],
        ['-ment (le moment)', '-té (la liberté)'],
        ['-eau (le bateau)', '-ette (la baguette)'],
        ['-isme (le tourisme)', '-ure (la voiture)'],
        ['-ier (le cahier)', '-ance / -ence (la chance)'],
      ]},
      { type: 'rule', text: 'Adjectives usually add -e for the feminine: grand → grande.' },
      { type: 'examples', items: [['un petit garçon', 'a little boy'], ['une petite fille', 'a little girl']] },
      { type: 'tip', text: 'Exceptions exist: la plage, la page, l\'eau (f.), le musée (m.).' },
    ],
  },
  {
    id: 'definite-articles', title: 'Definite Articles', group: 'Nouns & articles',
    summary: 'le / la / l\' / les = "the". Also used for general statements and likes.',
    blocks: [
      { type: 'table', head: ['Form', 'Use'], rows: [
        ['le', 'masculine singular'], ['la', 'feminine singular'],
        ['l\'', 'before a vowel or silent h'], ['les', 'all plurals'],
      ]},
      { type: 'rule', text: 'Contractions: à + le = au, à + les = aux, de + le = du, de + les = des.' },
      { type: 'examples', items: [["J'aime le chocolat.", 'I like chocolate.'], ['Je vais au cinéma.', "I'm going to the cinema."], ["l'hôtel, l'ami", 'the hotel, the friend']] },
      { type: 'tip', text: 'After aimer, adorer, détester, préférer use le/la/les, not du/de la.' },
    ],
  },
  {
    id: 'indefinite-articles', title: 'Indefinite Articles', group: 'Nouns & articles',
    summary: 'un / une / des = "a / an / some" for countable things.',
    blocks: [
      { type: 'table', head: ['Form', 'Use'], rows: [['un', 'masculine singular'], ['une', 'feminine singular'], ['des', 'plural']] },
      { type: 'rule', text: 'After a negation, un / une / des become de (d\').' },
      { type: 'examples', items: [["J'ai un frère.", 'I have a brother.'], ["Je n'ai pas de frère.", "I don't have a brother."], ['Il y a des pommes.', 'There are some apples.']] },
      { type: 'tip', text: 'Exception: with être the article stays — Ce n\'est pas un chat.' },
    ],
  },
  {
    id: 'partitive-articles', title: 'Partitive Articles', group: 'Nouns & articles',
    summary: 'du / de la / de l\' = "some" for things you can\'t count (an unspecified amount).',
    blocks: [
      { type: 'table', head: ['Form', 'Use'], rows: [['du', 'masculine'], ['de la', 'feminine'], ["de l'", 'before a vowel'], ['des', 'plural']] },
      { type: 'rule', text: 'Negative → de / d\'. Quantities → de: beaucoup de, un kilo de, un peu de.' },
      { type: 'examples', items: [['Je bois du café.', 'I drink (some) coffee.'], ["Je ne bois pas de café.", "I don't drink coffee."], ["Un verre d'eau.", 'A glass of water.']] },
    ],
  },
  {
    id: 'subject-pronouns', title: 'Subject Pronouns', group: 'Pronouns',
    summary: 'Who does the action.',
    blocks: [
      { type: 'table', head: ['Singular', 'Plural'], rows: [
        ['je (j\') — I', 'nous — we'], ['tu — you (informal)', 'vous — you (formal / plural)'],
        ['il / elle — he / she', 'ils / elles — they'], ['on — we / one (informal)', ''],
      ]},
      { type: 'examples', items: [['On va au parc ?', 'Shall we go to the park?'], ['Vous êtes prêts ?', 'Are you (all) ready?']] },
      { type: 'tip', text: 'ils = mixed or masculine group; elles only for all-female groups.' },
    ],
  },
  {
    id: 'present-tense', title: 'Present Tense', group: 'Verbs & tenses',
    summary: 'Regular verbs: remove -er / -ir / -re and add the endings.',
    blocks: [
      { type: 'table', head: ['', 'parler (-er)', 'finir (-ir)', 'vendre (-re)'], rows: [
        ['je', 'parle', 'finis', 'vends'], ['tu', 'parles', 'finis', 'vends'], ['il/elle', 'parle', 'finit', 'vend'],
        ['nous', 'parlons', 'finissons', 'vendons'], ['vous', 'parlez', 'finissez', 'vendez'], ['ils/elles', 'parlent', 'finissent', 'vendent'],
      ]},
      { type: 'examples', items: [['Je parle français.', 'I speak / am speaking French.'], ['Nous finissons à six heures.', 'We finish at six.']] },
      { type: 'tip', text: 'French has one present tense for both "I speak" and "I am speaking".' },
    ],
  },
  {
    id: 'irregular-verbs', title: 'Common Irregular Verbs', group: 'Verbs & tenses',
    summary: 'The most frequent verbs are irregular — learn them by heart.',
    blocks: [
      { type: 'table', head: ['', 'être', 'avoir', 'aller', 'faire'], rows: [
        ['je', 'suis', 'ai', 'vais', 'fais'], ['tu', 'es', 'as', 'vas', 'fais'], ['il/elle', 'est', 'a', 'va', 'fait'],
        ['nous', 'sommes', 'avons', 'allons', 'faisons'], ['vous', 'êtes', 'avez', 'allez', 'faites'], ['ils/elles', 'sont', 'ont', 'vont', 'font'],
      ]},
      { type: 'table', head: ['', 'pouvoir', 'vouloir', 'venir', 'prendre'], rows: [
        ['je', 'peux', 'veux', 'viens', 'prends'], ['il/elle', 'peut', 'veut', 'vient', 'prend'],
        ['nous', 'pouvons', 'voulons', 'venons', 'prenons'], ['ils/elles', 'peuvent', 'veulent', 'viennent', 'prennent'],
      ]},
    ],
  },
  {
    id: 'passe-compose', title: 'Passé Composé', group: 'Verbs & tenses',
    summary: 'Completed actions in the past.',
    blocks: [
      { type: 'rule', text: 'Structure: avoir / être (present) + past participle' },
      { type: 'table', head: ['Verb type', 'Participle'], rows: [['-er → -é', 'mangé'], ['-ir → -i', 'fini'], ['-re → -u', 'vendu'], ['irregular', 'eu, été, fait, pris, vu, dit']] },
      { type: 'rule', text: 'Être verbs (movement + reflexive): aller, venir, partir, arriver, entrer, sortir, naître, mourir, rester, tomber… Participle agrees with the subject.' },
      { type: 'examples', items: [["J'ai mangé.", 'I ate / have eaten.'], ['Je suis allé(e).', 'I went.'], ['Elle est partie.', 'She left.'], ['Nous nous sommes levés.', 'We got up.']] },
    ],
  },
  {
    id: 'imparfait', title: 'Imparfait', group: 'Verbs & tenses',
    summary: 'Past descriptions, habits and ongoing background actions.',
    blocks: [
      { type: 'rule', text: 'Stem: nous form of the present minus -ons (nous parlons → parl-). Only exception: être → ét-.' },
      { type: 'table', head: ['Person', 'Ending', 'parler'], rows: [
        ['je', '-ais', 'parlais'], ['tu', '-ais', 'parlais'], ['il/elle', '-ait', 'parlait'],
        ['nous', '-ions', 'parlions'], ['vous', '-iez', 'parliez'], ['ils/elles', '-aient', 'parlaient'],
      ]},
      { type: 'examples', items: [['Quand j\'étais petit, je jouais au foot.', 'When I was little, I used to play football.'], ['Il pleuvait quand je suis sorti.', 'It was raining when I went out.']] },
      { type: 'tip', text: 'Imparfait = the scene (was doing / used to). Passé composé = the event (did).' },
    ],
  },
  {
    id: 'futur-simple', title: 'Futur Simple', group: 'Verbs & tenses',
    summary: 'Future actions: "will".',
    blocks: [
      { type: 'rule', text: 'Infinitive (drop final -e of -re verbs) + -ai, -as, -a, -ons, -ez, -ont' },
      { type: 'table', head: ['Irregular stems', ''], rows: [['être → ser-', 'avoir → aur-'], ['aller → ir-', 'faire → fer-'], ['pouvoir → pourr-', 'vouloir → voudr-'], ['venir → viendr-', 'voir → verr-']] },
      { type: 'examples', items: [['Je parlerai.', 'I will speak.'], ['Nous serons là.', 'We will be there.'], ['Il fera beau demain.', 'The weather will be nice tomorrow.']] },
    ],
  },
  {
    id: 'futur-proche', title: 'Futur Proche', group: 'Verbs & tenses',
    summary: 'Near future: "going to".',
    blocks: [
      { type: 'rule', text: 'Structure: aller (present) + infinitive' },
      { type: 'examples', items: [['Je vais manger.', "I'm going to eat."], ['Ils vont partir.', "They're going to leave."], ['Je ne vais pas sortir.', "I'm not going to go out."]] },
      { type: 'tip', text: 'Negation goes around aller: je ne vais pas…' },
    ],
  },
  {
    id: 'conditionnel', title: 'Conditionnel', group: 'Verbs & tenses',
    summary: '"Would" — politeness, wishes, hypotheses.',
    blocks: [
      { type: 'rule', text: 'Future stem + imparfait endings: -ais, -ais, -ait, -ions, -iez, -aient' },
      { type: 'examples', items: [['Je voudrais un café.', 'I would like a coffee.'], ['Tu pourrais m\'aider ?', 'Could you help me?'], ["Si j'avais le temps, je voyagerais.", 'If I had time, I would travel.']] },
      { type: 'tip', text: 'Si + imparfait → conditionnel. Never use the conditional right after si.' },
    ],
  },
  {
    id: 'subjonctif', title: 'Subjonctif', group: 'Verbs & tenses',
    summary: 'After expressions of necessity, wish, emotion and doubt + que.',
    blocks: [
      { type: 'rule', text: 'Stem: ils form of the present minus -ent (ils parlent → parl-) + -e, -es, -e, -ions, -iez, -ent' },
      { type: 'table', head: ['Triggers', 'Irregulars'], rows: [['il faut que', 'être → que je sois'], ['vouloir que', 'avoir → que j\'aie'], ['bien que', 'aller → que j\'aille'], ['avant que', 'faire → que je fasse']] },
      { type: 'examples', items: [['Il faut que tu partes.', 'You have to leave.'], ['Je veux que tu viennes.', 'I want you to come.']] },
    ],
  },
  {
    id: 'negation', title: 'Negation', group: 'Sentences',
    summary: 'ne … pas wraps around the conjugated verb.',
    blocks: [
      { type: 'table', head: ['Form', 'Meaning'], rows: [
        ['ne … pas', 'not'], ['ne … jamais', 'never'], ['ne … plus', 'no longer / no more'],
        ['ne … rien', 'nothing'], ['ne … personne', 'nobody'], ['ne … que', 'only'],
      ]},
      { type: 'examples', items: [['Je ne mange pas.', "I don't eat."], ["Je n'ai jamais vu Paris.", "I've never seen Paris."], ["Il n'y a plus de pain.", "There's no more bread."]] },
      { type: 'tip', text: 'In the passé composé it wraps the auxiliary: je n\'ai pas mangé. In speech, "ne" is often dropped.' },
    ],
  },
  {
    id: 'questions', title: 'Question Formation', group: 'Sentences',
    summary: 'Three ways to ask a yes/no question.',
    blocks: [
      { type: 'table', head: ['Style', 'Example'], rows: [
        ['Intonation (casual)', 'Tu viens ?'], ['Est-ce que (neutral)', 'Est-ce que tu viens ?'], ['Inversion (formal)', 'Viens-tu ?'],
      ]},
      { type: 'table', head: ['Question word', 'Meaning'], rows: [
        ['qui', 'who'], ['que / quoi', 'what'], ['où', 'where'], ['quand', 'when'],
        ['comment', 'how'], ['pourquoi', 'why'], ['combien', 'how much / many'], ['quel(le)(s)', 'which / what'],
      ]},
      { type: 'examples', items: [['Où est-ce que tu habites ?', 'Where do you live?'], ['A-t-il faim ?', 'Is he hungry?']] },
    ],
  },
  {
    id: 'object-pronouns', title: 'Object Pronouns', group: 'Pronouns',
    summary: 'Replace nouns. They go before the conjugated verb.',
    blocks: [
      { type: 'table', head: ['Direct', 'Indirect'], rows: [
        ['me (m\')', 'me (m\')'], ['te (t\')', 'te (t\')'], ['le / la (l\')', 'lui'], ['nous', 'nous'], ['vous', 'vous'], ['les', 'leur'],
      ]},
      { type: 'rule', text: 'y replaces à + place/thing; en replaces de + noun or quantities.' },
      { type: 'examples', items: [['Je le vois.', 'I see him / it.'], ['Je lui parle.', "I'm talking to him / her."], ["J'y vais.", "I'm going there."], ["J'en veux deux.", 'I want two (of them).']] },
      { type: 'tip', text: 'Order: me/te/nous/vous → le/la/les → lui/leur → y → en.' },
    ],
  },
  {
    id: 'possessive-adjectives', title: 'Possessive Adjectives', group: 'Adjectives',
    summary: 'Agree with the thing owned, not the owner.',
    blocks: [
      { type: 'table', head: ['', 'Masc.', 'Fem.', 'Plural'], rows: [
        ['my', 'mon', 'ma', 'mes'], ['your (tu)', 'ton', 'ta', 'tes'], ['his / her / its', 'son', 'sa', 'ses'],
        ['our', 'notre', 'notre', 'nos'], ['your (vous)', 'votre', 'votre', 'vos'], ['their', 'leur', 'leur', 'leurs'],
      ]},
      { type: 'examples', items: [['sa voiture', 'his car / her car'], ['mon amie', 'my (female) friend']] },
      { type: 'tip', text: 'Before a vowel, ma/ta/sa become mon/ton/son: mon école.' },
    ],
  },
  {
    id: 'demonstrative-adjectives', title: 'Demonstrative Adjectives', group: 'Adjectives',
    summary: '"this / that / these / those".',
    blocks: [
      { type: 'table', head: ['Form', 'Use'], rows: [['ce', 'masculine'], ['cet', 'masculine before a vowel / silent h'], ['cette', 'feminine'], ['ces', 'plural']] },
      { type: 'examples', items: [['ce livre', 'this / that book'], ['cet homme', 'this man'], ['cette maison-là', 'that house (over there)']] },
      { type: 'tip', text: 'Add -ci (this) or -là (that) to the noun for contrast.' },
    ],
  },
  {
    id: 'prepositions', title: 'Prepositions', group: 'Sentences',
    summary: 'Places, countries and position.',
    blocks: [
      { type: 'table', head: ['Use', 'Preposition'], rows: [
        ['cities', 'à Paris'], ['feminine countries (-e)', 'en France'], ['masculine countries', 'au Canada'], ['plural countries', 'aux États-Unis'],
      ]},
      { type: 'table', head: ['Position', 'Meaning'], rows: [
        ['sur / sous', 'on / under'], ['devant / derrière', 'in front of / behind'], ['dans', 'in'], ['entre', 'between'],
        ['à côté de', 'next to'], ['en face de', 'opposite'], ['chez', "at someone's place"],
      ]},
      { type: 'examples', items: [['Je vais chez le médecin.', "I'm going to the doctor's."], ['Le chat est sous la table.', 'The cat is under the table.']] },
    ],
  },
  {
    id: 'conjunctions', title: 'Common Conjunctions', group: 'Sentences',
    summary: 'Link ideas together.',
    blocks: [
      { type: 'table', head: ['French', 'English'], rows: [
        ['et', 'and'], ['mais', 'but'], ['ou', 'or'], ['donc', 'so / therefore'], ['car', 'because (formal)'],
        ['parce que', 'because'], ['quand', 'when'], ['si', 'if'], ['comme', 'as / since'], ['pourtant', 'yet / however'],
      ]},
      { type: 'examples', items: [['Je reste parce qu\'il pleut.', "I'm staying because it's raining."], ["Il est riche, pourtant il n'est pas heureux.", "He's rich, yet he isn't happy."]] },
    ],
  },
];
