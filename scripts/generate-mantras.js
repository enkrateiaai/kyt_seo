#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Reverse index: mantra slug → [{videoId, title, slug, free}]
const VIDEO_INDEX_PATH = path.join(__dirname, 'mantra-video-index.json');
const videoIndex = fs.existsSync(VIDEO_INDEX_PATH) ? JSON.parse(fs.readFileSync(VIDEO_INDEX_PATH, 'utf8')) : {};

const NAV = `
  <nav class="nav" id="nav">
    <div class="nav__inner">
      <a href="/" class="nav__logo"><img src="/icon.png" alt="KYT" style="width:28px;height:28px;border-radius:4px;object-fit:cover;flex-shrink:0;"><span class="nav__logo-text">Kundalini Yoga Tribe</span></a>
      <button class="nav__toggle" id="navToggle" aria-label="Menü öffnen"><span></span><span></span><span></span></button>
      <ul class="nav__links" id="navLinks">
        <li><a href="/blog">Blog</a></li>
        <li><a href="/mantras">Mantras</a></li>
        <li><a href="/videos">Videos</a></li>
        <li><a href="/live">Live</a></li>
      </ul>
    </div>
  </nav>`;

const FOOTER = `
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__grid">
        <div>
          <a href="/" class="nav__logo" style="margin-bottom:var(--s-md);display:inline-flex;">
            <img src="/icon.png" alt="KYT" style="width:28px;height:28px;border-radius:4px;object-fit:cover;">
            <span class="nav__logo-text">Kundalini Yoga Tribe</span>
          </a>
          <p class="footer__tagline">Kundalini Yoga & Sat Nam Rasayan – Praxis, Wissen, Gemeinschaft.</p>
        </div>
        <div>
          <h4>Praxis</h4>
          <ul>
            <li><a href="/artikel/sat-kriya-anleitung.html">Sat Kriya</a></li>
            <li><a href="/artikel/was-ist-kundalini-yoga.html">Was ist Kundalini Yoga?</a></li>
            <li><a href="/mantras">Mantra-Datenbank</a></li>
            <li><a href="/glossar">Glossar</a></li>
          </ul>
        </div>
        <div>
          <h4>Inhalte</h4>
          <ul>
            <li><a href="/videos">Videos</a></li>
            <li><a href="/blog">Blog</a></li>
            <li><a href="/live">Live Sessions</a></li>
          </ul>
        </div>
        <div>
          <h4>Info</h4>
          <ul>
            <li><a href="/impressum.html">Impressum</a></li>
            <li><a href="/datenschutz.html">Datenschutz</a></li>
          </ul>
        </div>
      </div>
      <p style="margin-top:var(--s-xl);color:var(--c-text-muted);font-size:0.8rem;">© 2026 Kundalini Yoga Tribe</p>
    </div>
  </footer>
  <script src="/js/nav.js"></script>`;

const HEAD = (title, desc, canonical, extra = '') => `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/png" href="/icon.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="#0a0a0a">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="KYT">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="https://kundaliniyogatribe.de/${canonical}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css">
  ${extra}
</head>
<body>`;

// ─── MANTRA DATA ────────────────────────────────────────────────────────────

const CAT_ICONS = {
  eroeffnung: '🙏',
  bija: '🌱',
  heilung: '💚',
  namen: '✨',
  meditation: '🧘',
  schutz: '🛡️',
  celestial: '🌊',
};

const CATEGORIES = {
  eroeffnung: 'Eröffnung & Abschluss',
  bija: 'Bija Mantras',
  heilung: 'Heilung & Fürsorge',
  namen: 'Göttliche Namen',
  meditation: 'Meditation & Bewusstsein',
  schutz: 'Schutz & Stärke',
  celestial: 'Celestial Communication',
};

const mantras = [
  // ── Eröffnung & Abschluss ──────────────────────────────────────────────
  {
    slug: 'ong-namo-guru-dev-namo',
    name: 'Ong Namo Guru Dev Namo',
    subtitle: 'Adi Mantra – das Eröffnungsmantra',
    kategorie: 'eroeffnung',
    kurzbeschreibung: 'Das universelle Eröffnungsmantra jeder Kundalini Yoga Stunde. Es verbindet die Praktizierende mit der goldenen Lehrerkette.',
    lines: [
      { text: 'Ong Namo', trans: 'Ich verbeuge mich vor dem Schöpfer, dem göttlichen Klang der Schöpfung' },
      { text: 'Guru Dev Namo', trans: 'Ich verbeuge mich vor dem subtilen, inneren Lehrer' },
    ],
    bedeutung: 'Ong Namo Guru Dev Namo ist das erste Mantra, das in jeder Kundalini Yoga Stunde gesungen wird – mindestens dreimal. Es öffnet den Kanal zur goldenen Lehrerkette (Guru Parampara) und verbindet die Praktizierende mit dem kollektiven Bewusstsein aller Lehrenden dieser Tradition. „Ong" ist das schöpferische Bewusstsein in Aktion (nicht das ruhende Absolut, das ist „Aum"), „Namo" bedeutet verehrungsvolle Begrüßung. „Guru Dev" – das subtile, göttliche Licht – ist jene innere Intelligenz, die uns von Dunkelheit zu Licht führt.',
    wirkung: 'Dieses Mantra zentriert den Geist, stimmt das Nervensystem auf die Praxis ein und schafft eine Schutzbarriere. Es heißt, dass wer es dreimal singt, unter dem Schutz der gesamten Lehrerkette steht.',
    praxis: 'Setze dich mit geradem Rücken in Sukhasana. Hände in Anjali Mudra (Gebetshaltung) vor der Brust. Singe dreimal auf einer Linie, dann einatmen. Die Vibration von „Ong" entsteht im Nasennebenhöhlen-Bereich, nicht in der Kehle. Augen 1/10 geöffnet, Blick zur Nasenspitze.',
    aussprache: 'Ong (nasales „ng") – Nah-mo – Guh-roo – Dev – Nah-mo',
    verwandte: ['aad-guray-nameh', 'mul-mantra'],
  },
  {
    slug: 'aad-guray-nameh',
    name: 'Aad Guray Nameh',
    subtitle: 'Mangala Charan – das Schutzgebet',
    kategorie: 'eroeffnung',
    kurzbeschreibung: 'Das vierfache Schutzmantra, gesungen nach dem Adi Mantra. Es hüllt die Aura in weißes Licht.',
    lines: [
      { text: 'Aad Guray Nameh', trans: 'Ich verbeuge mich vor dem Urlehrer, dem Ewigen' },
      { text: 'Jugaad Guray Nameh', trans: 'Ich verbeuge mich vor dem Lehrer aller Zeiten' },
      { text: 'Sat Guray Nameh', trans: 'Ich verbeuge mich vor dem wahren Lehrer' },
      { text: 'Siri Guru Devay Nameh', trans: 'Ich verbeuge mich vor dem großen, unsichtbaren göttlichen Weisen' },
    ],
    bedeutung: 'Dieses Mantra stammt aus dem Sukhmani Sahib, dem Gebet des Friedens im Sikh-Schrifttum. Es wird gesungen, um göttlichen Schutz einzuladen – für die Praxis, für das Fahren, für den Beginn eines neuen Projekts. Die vier Zeilen repräsentieren die vier Seiten der Aura und sollen diese mit weißem, schützendem Licht erfüllen.',
    wirkung: 'Stärkt das elektromagnetische Feld (Aura), schafft Klarheit und inneren Schutz. Yogi Bhajan empfahl dieses Mantra besonders vor dem Autofahren.',
    praxis: 'Wird direkt nach Ong Namo Guru Dev Namo gesungen. Dreimal wiederholen. Hände in Gyan Mudra (Daumen und Zeigefinger berühren sich) auf den Knien.',
    aussprache: 'Aad (kurzes „a") – Guh-ray – Nah-may. Jugaad: „J" wie im Deutschen, Betonung auf „gaad". Siri: „i" lang.',
    verwandte: ['ong-namo-guru-dev-namo', 'mul-mantra'],
  },
  {
    slug: 'mul-mantra',
    name: 'Mul Mantra',
    subtitle: 'Das Wurzelmantra – Grundlage aller Mantras',
    kategorie: 'eroeffnung',
    kurzbeschreibung: 'Der Kern des Sikh-Gebetbuchs Japji Sahib. Yogi Bhajan nannte es das „Mantra, das das Schicksal verändern kann".',
    lines: [
      { text: 'Ek Ong Kar', trans: 'Es gibt einen Schöpfer, der sich in der Schöpfung ausdrückt' },
      { text: 'Sat Nam', trans: 'Wahre Identität' },
      { text: 'Karta Purkh', trans: 'Das schöpferische Wesen' },
      { text: 'Nirbhao', trans: 'Furchtlos' },
      { text: 'Nirvair', trans: 'Ohne Feindschaft' },
      { text: 'Akal Murat', trans: 'Unvergängliche Gestalt' },
      { text: 'Ajuni Saibhang', trans: 'Nicht geboren, selbst leuchtend' },
      { text: 'Gur Prasad', trans: 'Durch die Gnade des Lehrers' },
      { text: 'Jap', trans: 'Wiederhole es!' },
      { text: 'Aad Sach Jugaad Sach', trans: 'Wahrhaftig am Anfang, wahrhaftig durch alle Zeiten' },
      { text: 'Haibhee Sach Nanak Hosee Bhee Sach', trans: 'Wahrhaftig jetzt, Nanak sagt: Es wird immer wahr sein' },
    ],
    bedeutung: 'Das Mul Mantra ist der Eröffnungssatz des Japji Sahib, des täglichen Gebets von Guru Nanak. Es beschreibt die Natur des Absoluten – ohne Personifikation, ohne Dogma. Jedes Wort ist ein eigenständiges Mantra. Yogi Bhajan lehrte, dass dieses Mantra so mächtig ist, dass es das Karma transformieren kann, wenn man es mit vollständigem Bewusstsein wiederholt.',
    wirkung: 'Öffnet das Bewusstsein für die Natur der Realität. Schafft tiefe Zentrierung, löst karmische Muster und verbindet mit dem Unendlichen.',
    praxis: 'Langsam und bewusst sprechen oder singen. Jede Zeile wie eine Wahrheit im Körper landen lassen. Als Meditation: 11–31 Minuten täglich.',
    aussprache: 'Ek-Ong-Kar fließend. „Nirbhao": Nirr-bhow. „Ajuni": Ah-JU-ni. „Saibhang": Sai-bhung.',
    verwandte: ['ong-namo-guru-dev-namo', 'sat-nam'],
  },
  {
    slug: 'may-the-long-time-sun',
    name: 'May the Long Time Sun Shine Upon You',
    subtitle: 'Abschlussgebet – Segen zum Ende der Stunde',
    kategorie: 'eroeffnung',
    kurzbeschreibung: 'Das traditionelle Abschlussgebet jeder Kundalini Yoga Stunde – eine Segnung der Studierenden.',
    lines: [
      { text: 'May the long time sun shine upon you', trans: 'Möge die ewige Sonne auf dich scheinen' },
      { text: 'All love surround you', trans: 'Möge dich alle Liebe umhüllen' },
      { text: 'And the pure light within you', trans: 'Und das reine Licht in dir' },
      { text: 'Guide your way on', trans: 'Möge deinen Weg erhellen' },
    ],
    bedeutung: 'Dieses englische Gebet stammt aus der keltischen Tradition und wurde von Yogi Bhajan in den Stundenabschluss integriert. Es beendet jede Kundalini Yoga Stunde mit einem Segen für alle Anwesenden. Nach dem Singen folgt dreimal „Sat Nam".',
    wirkung: 'Schließt die Energien der Praxis ab, versiegelt die Aura und sendet Liebe in alle Richtungen.',
    praxis: 'Am Ende der Stunde, nach der Tiefenentspannung. Alle singen gemeinsam, dann dreimal „Sat Nam" – das erste lang (Sat……Nam), die zweiten beiden kürzer.',
    aussprache: 'Englisch, keine Besonderheiten. Nach dem Lied: SAT (lang, ausatmen) NAM.',
    verwandte: ['sat-nam', 'ong-namo-guru-dev-namo'],
  },

  // ── Bija Mantras ──────────────────────────────────────────────────────────
  {
    slug: 'sat-nam',
    name: 'Sat Nam',
    subtitle: 'Bija Mantra – Wahre Identität',
    kategorie: 'bija',
    kurzbeschreibung: 'Das grundlegendste Mantra im Kundalini Yoga. „Sat Nam" bedeutet „Meine Identität ist Wahrheit" – ein Gruß und eine Praxis zugleich.',
    lines: [
      { text: 'Sat', trans: 'Wahrheit, das Ewige, das Unveränderliche' },
      { text: 'Nam', trans: 'Name, Identität, das Bewusstsein von' },
    ],
    bedeutung: 'Sat Nam ist sowohl Begrüßung als auch Kernmantra. Als Bija (Samen)-Mantra enthält es die gesamte Schöpfungskraft komprimiert in zwei Silben. „Sat" schwingt im Herzchakra, „Nam" im Nabelzentrum. In der Atemmeditation atmet man „Sat" ein und „Nam" aus – der gesamte Atemzyklus wird zum Gebet.',
    wirkung: 'Weckt das wahre Selbst, stärkt die Identität jenseits von Ego und Konditionierung. Reinigt das Unterbewusstsein. Yogi Bhajan lehrte: „Sat Nam drückt die Essenz der Naad Yoga Philosophie aus."',
    praxis: 'In jeder Kriya: beim Einatmen mental „Sat", beim Ausatmen „Nam". Als separates Mantra: Kiri Mudra (Zeigefinger gestreckt), 11–31 Minuten wiederholen. Als Gruß: Hände in Anjali Mudra, leichte Verbeugung.',
    aussprache: 'Sat (kurzes „a", wie „Satt") – Nam (nasales „m" am Ende, letztes „a" wie in „Nam"). Nie „Saat Naam".',
    verwandte: ['wahe-guru', 'mul-mantra', 'ong-namo-guru-dev-namo'],
  },
  {
    slug: 'wahe-guru',
    name: 'Wahe Guru',
    subtitle: 'Bija Mantra – Ekstase der Erleuchtung',
    kategorie: 'bija',
    kurzbeschreibung: 'Das Mantra der Ekstase. Wahe Guru drückt die überwältigende Freude aus, wenn Dunkelheit in Licht verwandelt wird.',
    lines: [
      { text: 'Wahe', trans: 'Wow! Der Ausruf des Staunens, der Ekstase' },
      { text: 'Guru', trans: 'Das, was von Dunkel (Gu) zu Licht (Ru) führt' },
    ],
    bedeutung: 'Wahe Guru ist weniger eine Beschreibung als ein Ausruf – vergleichbar mit „Oh mein Gott!" in einem Moment tiefer Erkenntnis. Es ist das Mantra der achten Chakra (Aura) und drückt die Erfahrung der Unendlichkeit aus. Zusammen mit Sat Nam bildet es das Grundvokabular des Kundalini Yoga.',
    wirkung: 'Öffnet das Herz, erzeugt Dankbarkeit und Freude. Aktiviert das sechste und siebte Chakra (Ajna und Sahasrara). Hilft bei Depression und mentaler Schwere.',
    praxis: 'Häufig kombiniert mit Sat Nam: „Sat Nam, Wahe Guru". Als eigenständige Meditation 11 Minuten lang mit Mul Bandh (Wurzelbandha) auf „Wahe" und Loslassen auf „Guru".',
    aussprache: 'Waa-hey (das „h" hörbar) – Guh-roo. Nicht „Wah-EE" oder „Why".',
    verwandte: ['sat-nam', 'ang-sang-wahe-guru', 'har-haray-haree'],
  },
  {
    slug: 'har',
    name: 'Har',
    subtitle: 'Bija Mantra – Schöpferkraft des Universums',
    kategorie: 'bija',
    kurzbeschreibung: 'Ein einzelnes, kraftvolles Bija Mantra für das Nabelzentrum. Har aktiviert die schöpferische Energie und bringt Gebete zur Manifestation.',
    lines: [
      { text: 'Har', trans: 'Das kreative Prinzip Gottes, der schöpferische Aspekt des Unendlichen' },
    ],
    bedeutung: 'Har ist eine der drei Aspekte Gottes im Kundalini Yoga (neben Hari und Haree). Es repräsentiert Gott als aktive, manifestierende Kraft – die Schöpfung in Aktion. Die Zungenspitze tippt kurz den vorderen Gaumen bei der Aussprache, was den Meridianpunkt aktiviert, der mit dem Nabelzentrum verbunden ist.',
    wirkung: 'Stärkt das Nabelzentrum (drittes Chakra), fördert Willenskraft, Entschlossenheit und Wohlstand. Yogi Bhajan: „Har ist der Same, aus dem alles wächst."',
    praxis: 'Sehr häufig in Kriyas mit Arm-Pumpen oder Nabelübungen. Klassisch: „Har Har Wahe Guru" – kraftvoll und mit Nachdruck wiederholen. Auch: auf jeden Arm-Schwung einmal „Har" ausrufen.',
    aussprache: 'Ein kurzes, angeschlagenes „H" – dann „ar". Die Zunge tippt kurz hinter die oberen Zähne. Nicht lang ziehen.',
    verwandte: ['hari', 'har-haray-haree', 'gobinday-mukunday'],
  },
  {
    slug: 'hari',
    name: 'Hari',
    subtitle: 'Bija Mantra – Fluss der Lebensenergie',
    kategorie: 'bija',
    kurzbeschreibung: 'Das fließende, heilende Aspekt der göttlichen Kraft. Hari aktiviert das Herzchakra und bringt Heilung in Bewegung.',
    lines: [
      { text: 'Hari', trans: 'Die strömende, heilende, fließende Kraft Gottes' },
    ],
    bedeutung: 'Hari ist der mittlere Aspekt der drei Har-Formen (Har – Hari – Haree). Während Har die rohe Schöpferkraft ist und Haree die Vollendung, ist Hari der Fluss dazwischen – das Werden, die Heilung, das Leben das sich entfaltet. Es ist eng mit Wasser, Emotion und dem Herzchakra verbunden.',
    wirkung: 'Aktiviert Mitgefühl und Heilung. Fördert emotionale Balance. Gut bei Herzkummer, Trauer und Blockaden im Herzbereich.',
    praxis: 'Oft in Meditations-Kombinationen: „Hari Har Hari Har". Oder: „Hari Nam Sat Nam Hari Nam Har, Hari Nam Sat Nam Sat Nam Har." In Sitali Pranayama als begleitendes Mantra.',
    aussprache: 'Ha-ree – das „r" ist ein leichtes indisches „r", kein deutsches Rollen. Kurzes „i" am Ende.',
    verwandte: ['har', 'har-haray-haree', 'sat-narayan-wahe-guru'],
  },
  {
    slug: 'ong',
    name: 'Ong',
    subtitle: 'Primärer Klang der Schöpfung',
    kategorie: 'bija',
    kurzbeschreibung: 'Der Urklang der aktiven Schöpfung – ähnlich wie „Om", aber nasaler und auf Manifestation ausgerichtet. Stimuliert das sechste und siebte Chakra.',
    lines: [
      { text: 'Ong', trans: 'Die unendliche kreative Energie in ihrer aktiven Form' },
    ],
    bedeutung: 'Ong und Om (Aum) sind verwandt, aber unterschiedlich. Om/Aum ist das Absolute, das ruhende Unmanifestierte. Ong ist dasselbe Absolute, aber im Zustand aktiver Schöpfung – vibrierend, schaffend, sich ausdrückend. Der nasale Klang von Ong vibriert direkt in den Nasennebenhöhlen und stimuliert den Hypothalamus. Im Mul Mantra und im Adi Mantra ist es der erste Laut.',
    wirkung: 'Erweckt das Stirnchakra (Ajna) und Kronenchakra (Sahasrara). Schärft Intuition und Wahrnehmung. Reinigt die Nasennebenhöhlen und aktiviert das Hypophysen-System.',
    praxis: 'Als einzelnes Bija: Auf einem Atemzug auf Ong singen, Vibration vollständig in den Kopf fühlen. In Pranayama: Auf die Ausatmung „Ong" – dabei Mul Bandh halten.',
    aussprache: 'Nicht „Ohm" – der Klang entsteht komplett nasal, das „ng" am Ende vibriert in Nase und Schädel. Mund fast geschlossen.',
    verwandte: ['ong-namo-guru-dev-namo', 'ong-so-hung', 'ek-ong-kar-sat-gur-prasad'],
  },
  {
    slug: 'so-hung',
    name: 'So Hung',
    subtitle: 'Atemmantra – Ich bin Das',
    kategorie: 'bija',
    kurzbeschreibung: 'Das natürliche Mantra des Atems. So Hung bedeutet „Ich bin Ich" – die Erkenntnis der eigenen Göttlichkeit.',
    lines: [
      { text: 'So', trans: 'Das – das Unendliche, das Absolute, das Schöpferische' },
      { text: 'Hung', trans: 'Ich, das persönliche Selbst' },
    ],
    bedeutung: 'So Hung ist das Mantra, das der Atem selbst spricht – „So" beim Einatmen, „Hung" beim Ausatmen. Es ist eine Form von „So Hum" aus dem Sanskrit (das bedeutet dasselbe: „Das bin ich"). In der Kundalini Yoga Tradition ist „Hung" eine kraftvollere Form als das Sanskrit „Hum". Das Mantra erinnert uns bei jedem Atemzug daran, dass unser wahrstes Selbst das Unendliche ist.',
    wirkung: 'Verbindet das persönliche mit dem universellen Bewusstsein. Ideal für tiefe Meditationen und Stille. Beruhigt das Nervensystem, löst Trennungsgefühle.',
    praxis: 'Einfach beim Atmen: „So" innerlich beim Einatmen, „Hung" beim Ausatmen. Keine besondere Körperhaltung nötig – überall praktizierbar. Als formale Meditation 11–31 Minuten.',
    aussprache: 'So (langes „o") – Hung (nasales „ng", wie im Deutschen „Lunge"). Nicht „Hunk".',
    verwandte: ['ong-so-hung', 'ham-saa', 'sa-ta-na-ma'],
  },

  // ── Heilung & Fürsorge ────────────────────────────────────────────────────
  {
    slug: 'ra-ma-da-sa',
    name: 'Ra Ma Da Sa Sa Say So Hung',
    subtitle: 'Siri Gaitri Mantra – universelles Heilungsmantra',
    kategorie: 'heilung',
    kurzbeschreibung: 'Das kraftvollste Heilungsmantra im Kundalini Yoga. Es zieht die heilenden Energien der Erde, des Feuers, des Äthers und des Unendlichen zusammen.',
    lines: [
      { text: 'Ra', trans: 'Sonnenenergie – Feuer, Wärme, Transformation' },
      { text: 'Ma', trans: 'Mondenergie – Empfang, Kühlung, Nährung' },
      { text: 'Da', trans: 'Erdenergie – Verwurzelung, Stabilität' },
      { text: 'Sa', trans: 'Universale Identität – der unpersönliche Unendliche' },
      { text: 'Say', trans: 'Das persönlichere Gesicht des Unendlichen' },
      { text: 'So Hung', trans: 'Ich bin Das – die Verbindung von persönlichem und universellem Selbst' },
    ],
    bedeutung: 'Dieses Mantra ruft die acht Schwingungen (Ra, Ma, Da, Sa, Sa, Say, So, Hung) auf, die den gesamten Kosmos von der Erde bis ins Unendliche repräsentieren. Es wird traditionell zur Selbstheilung und zur Fernheilung für andere eingesetzt. Yogi Bhajan sagte: „Dieses Mantra sitzt im mittleren Bereich – zwischen dem Materiellen und dem Spirituellen – und ist deshalb so wirksam."',
    wirkung: 'Heilung auf allen Ebenen – körperlich, emotional, geistig. Wird für kranke Angehörige gesungen. Aktiviert das Herzchakra als Kanal für Heilenergie.',
    praxis: 'Im Sitzen, Hände in Gyan Mudra. Augen geschlossen. Einatmen vor jeder Runde. Das zweite „Sa" (Say) eine Terz höher als das erste. 11–31 Minuten. Beim Singen an die Person denken, für die man heilt.',
    aussprache: 'Ra-Ma-Da-Sa – kurze Pause – Sa-Say-So-Hung. Fließend, in einer Tonlinie mit einem kleinen Anstieg auf „Say".',
    verwandte: ['ang-sang-wahe-guru', 'guru-guru-wahe-guru-guru-ram-das-guru', 'ardas-bhaee'],
  },
  {
    slug: 'ang-sang-wahe-guru',
    name: 'Ang Sang Wahe Guru',
    subtitle: 'Das Mantra der göttlichen Präsenz im Körper',
    kategorie: 'heilung',
    kurzbeschreibung: 'Jede Zelle meines Wesens ist lebendig mit der Ekstase des Göttlichen. Dieses Mantra besiegt das Gefühl von Einsamkeit und Getrenntheit.',
    lines: [
      { text: 'Ang', trans: 'Körperteil, Glied, jede Zelle' },
      { text: 'Sang', trans: 'Mit, zusammen, in Gemeinschaft' },
      { text: 'Wahe Guru', trans: 'Die Ekstase des göttlichen Lehrers' },
    ],
    bedeutung: 'Ang Sang Wahe Guru bedeutet: Das Unendliche ist in meiner jeder Zelle. Nicht außerhalb, nicht in der Ferne – sondern vollständig präsent in jedem Teilchen des Seins. Yogi Bhajan lehrte dieses Mantra besonders in Zeiten der Verlust-Angst, bei Trennungen und beim Sterbensprozess als Trost.',
    wirkung: 'Heilt Einsamkeit, Verlustangst und Getrenntheitsgefühle. Stärkt das Immunsystem durch Aktivierung des lymphatischen Systems. Tiefe Geborgenheit und Verbundenheit.',
    praxis: 'Als Atemmeditation oder Gesang. Auch als Walking-Meditation: Bei jedem Schritt eine Silbe. 11 Minuten Gesang aus dem Herzchakra.',
    aussprache: 'Ung (nasales Ong) – Sung – Waa-hey – Guh-roo.',
    verwandte: ['ra-ma-da-sa', 'wahe-guru', 'sat-nam'],
  },
  {
    slug: 'ardas-bhaee',
    name: 'Ardas Bhaee',
    subtitle: 'Das Mantra der erhörten Gebete',
    kategorie: 'heilung',
    kurzbeschreibung: 'Das Mantra, das Yogi Bhajan als das wirksamste Gebet bezeichnete. Es übergibt den Wunsch vollständig an das Unendliche.',
    lines: [
      { text: 'Ardas Bhaee', trans: 'Mein Gebet ist gemacht / ist erhört' },
      { text: 'Amar Das Guru', trans: 'Guru Amar Das (3. Sikh-Guru) – der Guru des Mitgefühls' },
      { text: 'Amar Das Guru', trans: 'Wiederholung zur Vertiefung' },
      { text: 'Ardas Bhaee', trans: 'Das Gebet ist erfüllt' },
      { text: 'Ram Das Guru', trans: 'Guru Ram Das (4. Sikh-Guru) – der Guru der Wunder' },
      { text: 'Ram Das Guru', trans: 'Wiederholung' },
      { text: 'Ram Das Guru', trans: 'Dritte Wiederholung – vollständige Übergabe' },
      { text: 'Sachee Sahee', trans: 'Wahrhaftig bestätigt und versiegelt' },
    ],
    bedeutung: 'Ardas Bhaee ist ein Mantra der Übergabe. Es erklärt, dass das Gebet bereits erhört ist – eine Affirmation, die das Bewusstsein aus der Sorge in die Gewissheit verschiebt. Es ruft die Energien von Guru Amar Das (Mitgefühl) und Guru Ram Das (Wunderwirker) an.',
    wirkung: 'Durchbricht Blockaden, löst hartnäckige Situationen. Besonders wirksam bei: Heilungsgebeten, schwierigen Entscheidungen, Situationen die festgefahren scheinen.',
    praxis: 'Besonders kraftvoll wenn man das Anliegen formuliert, dann loslässt und das Mantra singt. 11 Minuten oder bis ein Gefühl der Erleichterung entsteht.',
    aussprache: 'Ardas (kurzes „a", Betonung auf „ar") – Bhay (nicht „Bhee" – viele Versionen weichen ab). Ram Das: Ram wie im Deutschen, Das wie „Dahs".',
    verwandte: ['ra-ma-da-sa', 'guru-guru-wahe-guru-guru-ram-das-guru', 'dhan-dhan-ram-das-guru'],
  },
  {
    slug: 'guru-guru-wahe-guru-guru-ram-das-guru',
    name: 'Guru Guru Wahe Guru Guru Ram Das Guru',
    subtitle: 'Das Mantra der Demut und des Wunderwirkens',
    kategorie: 'heilung',
    kurzbeschreibung: 'Das persönliche Mantra von Guru Ram Das – dem Guru der Heilung, Demut und Wunder. Öffnet das Herz für göttliche Führung.',
    lines: [
      { text: 'Guru Guru Wahe Guru', trans: 'Großes, großes ist das Göttliche – Ekstase des Unendlichen' },
      { text: 'Guru Ram Das Guru', trans: 'Guru Ram Das – der Dienende Gott, Träger des unendlichen Wissens' },
    ],
    bedeutung: 'Guru Ram Das war der 4. Sikh-Guru und ist bekannt als der Guru der Demut und der Wunder. Er baute den Golde Tempel in Amritsar. Im Kundalini Yoga wird er als Schutzpatron der Praktizierende angerufen. Dieses Mantra öffnet das Herz für Service, Heilung und für Wunder in unmöglichen Situationen.',
    wirkung: 'Zieht Wunder an, öffnet das Herz, fördert Service und Demut. Gilt als Direktverbindung zu Guru Ram Das für Heilungsanliegen.',
    praxis: 'Gesungen mit der Melodie von Nirinjan Kaur oder Sat Kartar. 11–31 Minuten. Auch bei Notlagen: Drei Atemzüge des Mantras können ausreichen.',
    aussprache: 'Guh-roo Guh-roo Waa-hey Guh-roo – Guh-roo Ram Das Guh-roo. Gleichmäßiger Rhythmus, das zweite „Guru Ram Das Guru" etwas tiefer.',
    verwandte: ['ardas-bhaee', 'dhan-dhan-ram-das-guru', 'ra-ma-da-sa'],
  },
  {
    slug: 'dhan-dhan-ram-das-guru',
    name: 'Dhan Dhan Ram Das Guru',
    subtitle: 'Mantra der Dankbarkeit und des Segens',
    kategorie: 'heilung',
    kurzbeschreibung: 'Ein überschwänglicher Dankgesang an Guru Ram Das. Wird bei Übergängen, Hochzeiten, Heilungen und Jubiläen gesungen.',
    lines: [
      { text: 'Dhan Dhan Ram Das Guru', trans: 'Gesegnet, gesegnet ist Guru Ram Das' },
      { text: 'Jin Siriaa Tinai Savaariaa', trans: 'Wer erschaffen wurde, wurde von ihm verschönert' },
      { text: 'Pooree Hoee Karaamaat', trans: 'Vollständig ist sein Wunder' },
      { text: 'Aap Sirjanhaarai Dhaariaa', trans: 'Der Schöpfer selbst hat ihn getragen/unterstützt' },
    ],
    bedeutung: 'Dieser Shabad stammt aus dem Sikh-Schrifttum und preist die Größe von Guru Ram Das. Er wird traditionell bei Hochzeiten gesungen – ein Zeichen göttlicher Fügung. Im Kundalini Yoga wird er bei Heilzeremonien und in Momenten tiefer Dankbarkeit eingesetzt.',
    wirkung: 'Öffnet das Herz für Dankbarkeit und Wunder. Besonders wirkungsvoll bei Lebensübergängen, nach Heilungen und in Momenten in denen man Glück und Segen anerkennen möchte.',
    praxis: 'Gesungen oder als Kirtan. Traditionell mit Tabla und Harmonium. Als Meditation: langsam und mit vollem Herzen, jede Zeile tief einsinken lassen.',
    aussprache: 'Dhan (kurzes „a" wie „dahn") – Ram Das wie gewohnt – Guru. „Siriaa": Si-ri-aa.',
    verwandte: ['ardas-bhaee', 'guru-guru-wahe-guru-guru-ram-das-guru'],
  },
  {
    slug: 'aap-sahaee-hoa',
    name: 'Aap Sahaee Hoa',
    subtitle: 'Mantra des göttlichen Schutzes',
    kategorie: 'heilung',
    kurzbeschreibung: 'Das Göttliche selbst ist zum Helfer geworden. Dieses Mantra wendet Negativität ab und zieht göttlichen Beistand an.',
    lines: [
      { text: 'Aap Sahaee Hoa', trans: 'Das Göttliche selbst ist mein Helfer geworden' },
      { text: 'Sachey Daa Sachaa Dhoa', trans: 'Der wahrhaftige Herr der Wahrheit' },
      { text: 'Har Har Har', trans: 'Gott, Gott, Gott – die kreative Kraft, dreifach bestätigt' },
    ],
    bedeutung: 'Aap Sahaee Hoa kommt aus den Shabads von Guru Arjan Dev, dem 5. Sikh-Guru. Es ist ein Mantra für Situationen der Bedrängnis, Unsicherheit oder wenn man sich alleingelassen fühlt. Es erklärt, dass das Göttliche die Verantwortung übernommen hat – wortwörtlich: als Anwalt, als Beschützer.',
    wirkung: 'Wendet Negativität ab, schützt vor Feinden (innen wie außen). Bringt Hilfe in aussichtslosen Situationen. 40 Tage Praxis soll hartnäckige Muster lösen.',
    praxis: 'Empfohlen: Täglich zur gleichen Zeit, 11–31 Minuten. Oder 40 Tage morgens. Hände in Gyan Mudra, Augen geschlossen, Atem durch die Nase.',
    aussprache: 'Aap (wie „ahp") – Sa-ha-ee (drei Silben) – Hoa (wie „hoh-ah"). Sachey (Sa-chey) – Daa – Sachaa – Dhoa (wie „Dhoh-ah").',
    verwandte: ['rakhe-rakhanhar', 'ardas-bhaee', 'chattra-chakkra-vartee'],
  },
  {
    slug: 'rakhe-rakhanhar',
    name: 'Rakhe Rakhanhar',
    subtitle: 'Abendschutzgebet – Sopurkh des Schutzes',
    kategorie: 'heilung',
    kurzbeschreibung: 'Das Schutzgebet für die Nacht und für alle Lebenslagen. Befreit von negativen Einflüssen und stärkt den göttlichen Schutz.',
    lines: [
      { text: 'Rakhe Rakhanhar Aap Ubaarian', trans: 'Der Beschützer beschützt – aus eigenem Willen rettet er uns' },
      { text: 'Gur Kee Pairee Paa-ay Kaaj Savaarian', trans: 'Die Füße des Lehrers berühren – alle Angelegenheiten werden erfüllt' },
      { text: 'Hoaa Aap Dayaal Manho Na Visaarian', trans: 'Er wurde gütig, er vergisst uns nicht im Geist' },
      { text: 'Saadh Janaa Kai Sang Bhavajal Taarian', trans: 'In Gesellschaft der Heiligen überquert man den Ozean der Existenz' },
      { text: 'Saakat Nindak Dusht Khin Maa-eh Bidaarian', trans: 'Die gottlosen Verleumder und Feinde werden sofort vertrieben' },
      { text: 'Tis Saahib Kee Tayk Naanak Manai Maa-eh', trans: 'Auf diesen Herrn verlässt sich Nanak in seinem Geist' },
      { text: 'Jis Simrat Sukh Ho-ay Sagalay Dookh Jaa-eh', trans: 'Beim Erinnern seiner kommt Freude und alle Leiden gehen' },
    ],
    bedeutung: 'Dieser Shabad von Guru Arjan Dev wird traditionell abends gesungen – als Schutz für die Nacht. Im Kundalini Yoga wird er eingesetzt, um negative Einflüsse aus dem Feld zu entfernen und göttlichen Schutz für die gesamte Familie zu bitten.',
    wirkung: 'Reinigt das Energiefeld, schützt vor negativen Schwingungen, stärkt die Aurahülle. Besonders wirksam am Abend vor dem Schlafen.',
    praxis: 'Traditionell nach dem Abendgebet oder in der Meditation. Auch als Kirtan. 11 Minuten, in entspannter Sitzhaltung.',
    aussprache: 'Rakhe (Rak-hey) – Rakhanhar (Rakh-an-haar). Fließende Melodie, nicht abgehackt.',
    verwandte: ['aap-sahaee-hoa', 'chattra-chakkra-vartee', 'aad-guray-nameh'],
  },

  // ── Göttliche Namen ───────────────────────────────────────────────────────
  {
    slug: 'gobinday-mukunday',
    name: 'Gobinday Mukunday',
    subtitle: 'Guru Gaitri Mantra – acht göttliche Aspekte',
    kategorie: 'namen',
    kurzbeschreibung: 'Acht Namen Gottes, die acht Aspekte des Unendlichen beschreiben. Reinigt das Unterbewusstsein und stärkt das elektromagnetische Feld.',
    lines: [
      { text: 'Gobinday', trans: 'Erhalter, Unterstützer' },
      { text: 'Mukunday', trans: 'Befreier, Erlöser' },
      { text: 'Udaaray', trans: 'Erleuchter, Erheber' },
      { text: 'Apaaray', trans: 'Unendlicher, Grenzenloser' },
      { text: 'Hariyang', trans: 'Zerstörer (des Negativen), Vernichter' },
      { text: 'Kariyang', trans: 'Schöpfer, Verursacher' },
      { text: 'Nirnamay', trans: 'Namenloser, jenseits aller Bezeichnung' },
      { text: 'Akamay', trans: 'Wunschloser, Selbstgenügsamer' },
    ],
    bedeutung: 'Dieses Mantra beschreibt acht kosmische Qualitäten des Unendlichen. Durch die Wiederholung dieser Qualitäten werden sie im eigenen Bewusstsein aktiviert. Yogi Bhajan lehrte, dass dieses Mantra das Unterbewusstsein von den gespeicherten Mustern der vergangenen elf Jahre reinigen kann, wenn es 40 Tage täglich praktiziert wird.',
    wirkung: 'Reinigt das Unterbewusstsein, stärkt die Aurahülle, schützt vor dem negativen Geist (Upa-dristi). Balanciert die Hemisphären des Gehirns. Besonders hilfreich bei emotionalen Verletzungen aus der Vergangenheit.',
    praxis: 'Typischerweise in schnellem Tempo mit kräftigem Atem, oft kombiniert mit Arm-Übungen oder Nabelimpulsen. 11–31 Minuten. Klassisch auch als Kirtan mit Harmonium.',
    aussprache: 'Goh-bin-day – Moo-kun-day – Oo-daa-ray – Ah-paa-ray – Hah-ri-yung – Kah-ri-yung – Nirr-nah-may – Ah-kah-may. Betonung jeweils auf der zweiten Silbe.',
    verwandte: ['har', 'sa-re-sa-sa', 'chattra-chakkra-vartee'],
  },
  {
    slug: 'sat-narayan-wahe-guru',
    name: 'Sat Narayan Wahe Guru Hari Narayan Sat Nam',
    subtitle: 'Mantra der inneren Ruhe und Stabilität',
    kategorie: 'namen',
    kurzbeschreibung: 'Das Mantra des wahren Sustainers. Bringt Frieden, Harmonie und Schutz in das Zuhause und in Beziehungen.',
    lines: [
      { text: 'Sat Narayan', trans: 'Der wahre Erhalter / Das göttliche Wasser der Wahrheit' },
      { text: 'Wahe Guru', trans: 'Ekstase des Lehrers' },
      { text: 'Hari Narayan', trans: 'Der heilende Erhalter' },
      { text: 'Sat Nam', trans: 'Wahre Identität' },
    ],
    bedeutung: 'Narayan ist ein Name Vishnus – des Erhalters in der hinduistischen Trinität. Im Kundalini Yoga repräsentiert Narayan das Wasserelement und die erhaltende, nährende Kraft des Unendlichen. Sat Narayan ist besonders für das Zuhause und Beziehungen – es schützt die Verbindungen und bringt langanhaltenden Frieden.',
    wirkung: 'Harmonisiert Beziehungen, stärkt das Wasserelement im Körper (Nieren, Blase). Bringt tiefe innere Ruhe und Stabilität. Gut bei Unruhe und emotionaler Instabilität.',
    praxis: 'Als Abendmeditation, 11 Minuten. Oder als Kirtan-Gesang. Schöne Praxis für Paare zusammen.',
    aussprache: 'Sat – Na-ra-yan (drei Silben, Betonung auf „ya") – Waa-hey – Guh-roo. Hari: Ha-ri.',
    verwandte: ['hari', 'sat-nam', 'ang-sang-wahe-guru'],
  },
  {
    slug: 'pavan-pavan',
    name: 'Pavan Pavan Pavan Pavan Para Para Para Para',
    subtitle: 'Prana Kriya Mantra – Atemmantra',
    kategorie: 'namen',
    kurzbeschreibung: 'Das Mantra des Prana (Lebensenergie). Aktiviert den Atem als heilige Verbindung zum Göttlichen.',
    lines: [
      { text: 'Pavan Pavan Pavan Pavan', trans: 'Atem, Atem, Atem, Atem' },
      { text: 'Para Para Para Para', trans: 'Über alles, jenseits alles, transzendent' },
      { text: 'Pavan Guru', trans: 'Der Atem ist der Lehrer / Gott' },
      { text: 'Wahe Guru Wahe Guru', trans: 'Wow! Ekstase des Göttlichen' },
      { text: 'Wahe Jio', trans: 'Wow! Der lebendige Atem, das lebendige Wesen' },
    ],
    bedeutung: 'Pavan bedeutet Atem, Wind, Prana. Dieses Mantra verehrt den Atem selbst als Lehrer und als göttliche Kraft. Yogi Bhajan lehrte: „Der Atem ist das Leben. Wer den Atem kontrolliert, kontrolliert das Leben." Dieses Mantra verbindet uns mit der Prana Kriya – der direkten Arbeit mit der Lebensenergie.',
    wirkung: 'Reinigt die Atemwege und die Lungen, stärkt das Nervensystem. Verbindet mit Prana als Lebenskraft. Sehr beruhigend und zentrierend.',
    praxis: 'Gesungen als Kirtan oder in der Meditation. Variante: beim Singen bewusst tief atmen und die Verbindung von Mantra und Atem spüren.',
    aussprache: 'Pa-van (kurzes „a", Betonung auf „van") – Para (Pa-ra, kurzes „a"). Pavan Guru: fließend.',
    verwandte: ['ong-namo-guru-dev-namo', 'pavan-guru', 'so-hung'],
  },
  {
    slug: 'ong-so-hung',
    name: 'Ong So Hung',
    subtitle: 'Celestial Communication Mantra – Schöpfer und Ich sind Eins',
    kategorie: 'namen',
    kurzbeschreibung: 'Das Mantra der non-dualen Einheit. Schöpfer und Geschöpf sind dasselbe. Klassisches Celestial Communication Mantra.',
    lines: [
      { text: 'Ong', trans: 'Der Schöpfer, die kreative unendliche Energie' },
      { text: 'So', trans: 'Das Absolute, das Unendliche' },
      { text: 'Hung', trans: 'Ich, das persönliche Selbst' },
    ],
    bedeutung: 'Ong So Hung schließt den Kreis von Schöpfer zu Geschöpf. „Ich bin der Schöpfer, der Schöpfer ist ich" – eine direkte Aussage über die non-duale Natur der Realität. In der Celestial Communication (Himmelssprache) wird dieses Mantra mit fließenden Armbewegungen verbunden, die die kosmische Einheit ausdrücken.',
    wirkung: 'Verbindet oberes und unteres Chakren-System. Stärkt das Selbstbewusstsein auf göttlicher Ebene. Löst Minderwertigkeitsgefühle und das Gefühl der Trennung vom Göttlichen.',
    praxis: 'Als Celestial Communication mit Armbewegungen. Oder als stille Atemmeditation: Ong beim Einatmen, So Hung beim Ausatmen.',
    aussprache: 'Ong (nasal) – So (langes o) – Hung (nasales ng). Gleichmäßiger Rhythmus.',
    verwandte: ['so-hung', 'ong', 'sa-ta-na-ma'],
  },
  {
    slug: 'humee-hum-brahm-hum',
    name: 'Humee Hum Brahm Hum',
    subtitle: 'Mantra der kosmischen Identität',
    kategorie: 'namen',
    kurzbeschreibung: 'Wir sind Wir, wir sind Brahm (das Absolute). Das Mantra der absoluten Identifikation mit dem Unendlichen.',
    lines: [
      { text: 'Humee Hum', trans: 'Wir sind Wir – unser Wesen ist was es ist' },
      { text: 'Brahm Hum', trans: 'Wir sind Brahm – wir sind das Absolute' },
    ],
    bedeutung: 'Brahm (nicht zu verwechseln mit Brahma dem Schöpfergott) ist das unpersönliche Absolute – die unveränderliche Wahrheit hinter allen Erscheinungen. Dieses Mantra erklärt: Unser tiefstes Wesen ist identisch mit dem Absoluten. Es ist eine direkte Umsetzung der vedantischen Mahavakya (großen Aussprüche) wie „Aham Brahmasmi" (Ich bin Brahman).',
    wirkung: 'Stärkt das Gefühl der absoluten Sicherheit und des Vertrauens. Löst existenzielle Ängste. Sehr hilfreich bei Identitätskrisen.',
    praxis: 'Als Kirtan oder als Whisper Meditation (Flüstern) – besonders kraftvoll. 31 Minuten für tiefe Wirkung.',
    aussprache: 'Hoo-mee – Hum – Brahm (kurzes „a") – Hum. Alle vier Silben gleichmäßig betont.',
    verwandte: ['ong-so-hung', 'so-hung', 'mul-mantra'],
  },
  {
    slug: 'har-haray-haree',
    name: 'Har Haray Haree Wahe Guru',
    subtitle: 'Mantra der göttlichen Entfaltung',
    kategorie: 'namen',
    kurzbeschreibung: 'Die drei Aspekte der Schöpferkraft: Samen, Entfaltung, Vollendung – gefolgt von der Ekstase des Lehrers.',
    lines: [
      { text: 'Har', trans: 'Gott als Samen, als Potenzial, als erster Impuls' },
      { text: 'Haray', trans: 'Gott als Entfaltung, als Wachstum, als Prozess' },
      { text: 'Haree', trans: 'Gott als vollendete Blüte, als Erfüllung' },
      { text: 'Wahe Guru', trans: 'Die Ekstase der Erleuchtung' },
    ],
    bedeutung: 'Die drei Formen Har-Haray-Haree repräsentieren den vollständigen Zyklus der Schöpfung: Potenzial → Entfaltung → Vollendung. Es ist wie Samen → Baum → Frucht. Dieses Mantra aktiviert diesen gesamten Schöpfungsprozess im eigenen Leben – es unterstützt, dass Projekte, Heilungsprozesse und Bewusstseinsreisen ihren vollen Zyklus durchlaufen.',
    wirkung: 'Unterstützt Projekte und Pläne von der Idee bis zur Vollendung. Fördert Ausdauer und Geduld. Aktiviert alle drei Nabelaspekte.',
    praxis: 'Schnell und rhythmisch gesungen, oft mit Trommelbegleitung. 11 Minuten, kräftig und mit Nabelimpuls.',
    aussprache: 'Har (kurz) – Ha-ray (zwei Silben) – Ha-ree (zwei Silben) – Waa-hey Guh-roo.',
    verwandte: ['har', 'hari', 'wahe-guru'],
  },
  {
    slug: 'sa-re-sa-sa',
    name: 'Sa Re Sa Sa',
    subtitle: 'Mangala Charan Mantra – kosmischer Schutz',
    kategorie: 'namen',
    kurzbeschreibung: 'Ein viergliedriges Schutzmantra, das durch den Klang von Unendlichkeit alle negativen Einflüsse neutralisiert.',
    lines: [
      { text: 'Sa Re Sa Sa, Sa Re Sa Sa, Sa Re Sa Sa, Sa Rang', trans: 'Das Unendliche – die Wahrheit durchdringt alles' },
      { text: 'Har Re Har Har, Har Re Har Har, Har Re Har Har, Har Rang', trans: 'Die Schöpferkraft durchdringt alles' },
    ],
    bedeutung: 'Dieses Mantra verbindet „Sa" (die kosmische Identität, das Unendliche) mit „Har" (die kreative Kraft). Das Wort „Rang" bedeutet „gefärbt von" oder „erfüllt von" – die vollständige Bedeutung: Im Unendlichen getaucht, von der Schöpferkraft erfüllt. Es ist ein kraftvolles Schutz- und Reinigungsmantra.',
    wirkung: 'Reinigt die Aura, schützt vor negativen Energien, öffnet die Verbindung zum Unendlichen. Celestial Communication klassiker.',
    praxis: 'Als Celestial Communication oder als Kirtan. Die Melodie ist wichtig – am besten einer Aufnahme folgen. 11 Minuten.',
    aussprache: 'Sa (kurz) – Re (kurzes „e") – Sa Sa – Sa Rang (Ring vibriert im Brustbereich).',
    verwandte: ['gobinday-mukunday', 'aad-guray-nameh', 'chattra-chakkra-vartee'],
  },
  {
    slug: 'pavan-guru',
    name: 'Pavan Guru Wahe Guru Wahe Jio',
    subtitle: 'Mantra des heiligen Atems',
    kategorie: 'namen',
    kurzbeschreibung: 'Der Atem ist der Lehrer. Dieses Mantra ehrt den Prana (Lebensenergie) als direkten Lehrer und als Verbindung zum Göttlichen.',
    lines: [
      { text: 'Pavan Guru', trans: 'Der Atem ist der Lehrer / Gott' },
      { text: 'Wahe Guru', trans: 'Wow, Ekstase des Göttlichen' },
      { text: 'Wahe Guru', trans: 'Wiederholung der Ekstase' },
      { text: 'Wahe Jio', trans: 'Wow, das lebendige Wesen / die Seele' },
    ],
    bedeutung: 'Jio ist eine besondere Form der Anrede – ehrerbietig, liebevoll, wie man einen geliebten Menschen anspricht. „Wahe Jio" bedeutet: Wow, meine Seele! Der Atem wird hier nicht nur als physiologischer Vorgang verstanden, sondern als der direkteste Lehrer, den wir haben – ständig präsent, immer zugänglich.',
    wirkung: 'Vertieft die Atempraxis, verbindet Pranayama mit spiritueller Erfahrung. Öffnet die Herzchakra, fördert Dankbarkeit für das Leben.',
    praxis: 'Verbunden mit Pranayama-Übungen oder als eigenständiger Gesang. 11 Minuten.',
    aussprache: 'Pa-van – Guh-roo – Waa-hey – Guh-roo – Waa-hey – Jee-oh (Jio = zwei Silben).',
    verwandte: ['pavan-pavan', 'wahe-guru', 'so-hung'],
  },

  // ── Meditation & Bewusstsein ──────────────────────────────────────────────
  {
    slug: 'sa-ta-na-ma',
    name: 'Sa Ta Na Ma',
    subtitle: 'Panj Shabd – Kirtan Kriya Mantra',
    kategorie: 'meditation',
    kurzbeschreibung: 'Das wichtigste Meditationsmantra im Kundalini Yoga. Fünf Urlaute, die den vollständigen Zyklus der Schöpfung repräsentieren.',
    lines: [
      { text: 'Sa', trans: 'Unendlichkeit, Geburt, Kosmos' },
      { text: 'Ta', trans: 'Leben, Existenz, Wahrheit' },
      { text: 'Na', trans: 'Tod, Transformation, Vollendung' },
      { text: 'Ma', trans: 'Wiedergeburt, Auferstehung, Erneuerung' },
    ],
    bedeutung: 'Sa Ta Na Ma sind die Bija-Silben aus „Sat Nam" – dem fundamentalen Mantra der Wahrheit. Zusammen beschreiben sie den ewigen Zyklus: aus dem Unendlichen ins Leben, durch den Tod zur Wiedergeburt. In der Kirtan Kriya werden diese Silben mit Fingertipps verbunden (Mudras): Sa = Daumen/Zeigefinger, Ta = Daumen/Mittelfinger, Na = Daumen/Ringfinger, Ma = Daumen/kleiner Finger.',
    wirkung: 'Stimuliert alle 84 Meridianpunkte am Gaumen. Wissenschaftlich untersucht: verbessert Gedächtnisleistung und kognitive Funktion (Alzheimer-Forschung). Balanciert die Hemisphären, reinigt das Unterbewusstsein.',
    praxis: 'Kirtan Kriya: 11 Minuten in drei Phasen – laut singen (2 Min.), Flüstern (2 Min.), mental (3 Min.), Flüstern (2 Min.), laut (2 Min.). Mit Fingertipps auf jeden Silbe. Augen auf die Stirn gerichtet (Ajna Mudra).',
    aussprache: 'Sa (kurz) – Ta (kurz, Zunge tippt Gaumen) – Na (nasal) – Ma (labial, Lippen schließen). Vier völlig gleichwertige Silben.',
    verwandte: ['sat-nam', 'ong-so-hung', 'so-hung'],
  },
  {
    slug: 'ek-ong-kar-sat-gur-prasad',
    name: 'Ek Ong Kar Sat Gur Prasad',
    subtitle: 'Das Wunder-Mantra – umkehrendes Mantra',
    kategorie: 'meditation',
    kurzbeschreibung: 'Das „Siri Mantra" – eines der mächtigsten Mantras im Kundalini Yoga. Es kehrt das Negative ins Positive um.',
    lines: [
      { text: 'Ek Ong Kar', trans: 'Es gibt einen Schöpfer, der sich in der Schöpfung ausdrückt' },
      { text: 'Sat Gur Prasad', trans: 'Durch die Wahrheit und die Gnade des Lehrers' },
    ],
    bedeutung: 'Yogi Bhajan lehrte, dass dieses Mantra das gesamte mentale Feld umkehrt. Wo der Geist negativ ist, wird er positiv. Es gehört zu den mächtigsten Mantras der Tradition und wird mit Ehrfurcht und Vorsicht eingesetzt. Wichtig: Direkt nach dem Mantra keine negativen Gedanken oder Worte – der Geist ist in einem besonders empfänglichen Zustand.',
    wirkung: 'Kehrt negative Gedankenmuster um, öffnet den Weg für Wunder. Stärkt das neutrale mentale Feld (Shuniya). Sehr kraftvoll für Depressionen und festgefahrene mentale Muster.',
    praxis: 'In stiller Meditation, mit geschlossenen Augen und Blick auf Ajna Chakra (Dritte Auge). Sehr langsam wiederholen. 11–31 Minuten. Danach 5 Minuten in Stille bleiben.',
    aussprache: 'Ek – Ong (nasal) – Kar – Sat – Gur (kurzes u) – Pra-sad (Betonung auf letzter Silbe). Sehr langsam, jede Silbe mit voller Präsenz.',
    verwandte: ['ek-ong-kar-sat-nam-siri-wahe-guru', 'mul-mantra', 'ong'],
  },
  {
    slug: 'ek-ong-kar-sat-nam-siri-wahe-guru',
    name: 'Ek Ong Kar Sat Nam Siri Wahe Guru',
    subtitle: 'Ashtang Mantra – Morgenmantra der Erweckung',
    kategorie: 'meditation',
    kurzbeschreibung: 'Das Morgenmantra der Ambrosial Hours. Acht Silben, die den vollständigen Pfad von der Schöpfung zur Erleuchtung beschreiben.',
    lines: [
      { text: 'Ek Ong Kar', trans: 'Einer Gott schafft alles' },
      { text: 'Sat Nam', trans: 'Sein Name ist Wahrheit' },
      { text: 'Siri', trans: 'Großartig, erhaben' },
      { text: 'Wahe Guru', trans: 'Grenzenlose Weisheit' },
    ],
    bedeutung: 'Dieses Mantra wird besonders in den Ambrosial Hours (Amrit Vela) praktiziert – in den zwei Stunden vor Sonnenaufgang, wenn der Vata-Geist ruhig und besonders empfänglich ist. Es ist ein Morgenmantra der Erweckung, das den ganzen Tag segnet. Die traditionelle Praxis ist 2,5 Stunden täglich.',
    wirkung: 'Erweckt Kundalini-Energie auf sanfte und tiefe Weise. Öffnet alle Chakren. Stärkt Intuition und Verbindung mit der eigenen Seele.',
    praxis: 'Im Sitzen, aufrechter Rücken, Nase auf Linie. Auf einer Linie auf der Ausatmung: Ek Ong Kar Sat Nam Siri – kurze Pause (einatmen) – Wahe Guru (mit Anheben der Energie). 11–31 Minuten oder 2,5 Stunden.',
    aussprache: 'Ek-Ong-Kar schnell (Ek fast verschluckt) – Sat-Nam – Sri (nicht Si-ri) – Waa-hey Guh-roo (Energie nach oben). Das ist anspruchsvoll und empfiehlt sich Audio-Führung für Anfänger.',
    verwandte: ['ek-ong-kar-sat-gur-prasad', 'mul-mantra', 'ong-namo-guru-dev-namo'],
  },
  {
    slug: 'ham-saa',
    name: 'Ham Saa / So Hum',
    subtitle: 'Das Atemmantra – Ich bin Das',
    kategorie: 'meditation',
    kurzbeschreibung: 'Das natürliche Mantra des Atems – jeder Mensch spricht es unbewusst ca. 21.600 mal täglich. Ham = Ich, Saa = Das Absolute.',
    lines: [
      { text: 'Ham', trans: 'Ich bin' },
      { text: 'Saa', trans: 'Das (das Absolute, das Unendliche)' },
    ],
    bedeutung: 'Ham Saa ist das Sanskrit-Mantra, das die gleiche Bedeutung wie So Hum trägt. In der Kundalini Yoga Tradition wird die Form „So Hung" bevorzugt (kraftvoller), aber Ham Saa ist die klassische vedantische Form. Es ist buchstäblich das Geräusch des Atems: der Einatem klingt nach „Ham", der Ausatem nach „Saa". Der Körper meditiert von alleine.',
    wirkung: 'Tiefstes Zentrieren und Verweilen in der eigenen Natur. Auflösung von Dualität. Ideal für Menschen, die mit lauteren Mantras überfordert sind.',
    praxis: 'Einfach beim Atmen zuhören: „Ham" beim Einatmen, „Saa" beim Ausatmen – ohne Steuerung des Atems. Überall und jederzeit möglich. Als formale Meditation: 31 Minuten.',
    aussprache: 'Ham (kurzes „a", m nasal) beim Einatmen – Saa (langes „aa") beim Ausatmen.',
    verwandte: ['so-hung', 'sa-ta-na-ma', 'wahe-guru-wahe-jio'],
  },
  {
    slug: 'wahe-guru-wahe-jio',
    name: 'Wahe Guru Wahe Jio',
    subtitle: 'Mantra der Freude und Dankbarkeit',
    kategorie: 'meditation',
    kurzbeschreibung: 'Wow, Lehrer! Wow, Seele! Ein Mantra des reinen Staunens über die Schönheit der Existenz.',
    lines: [
      { text: 'Wahe Guru', trans: 'Wow! Ekstatische Weisheit' },
      { text: 'Wahe Jio', trans: 'Wow! Meine Seele / das lebendige Wesen' },
    ],
    bedeutung: 'Jio ist eine ehrerbietige Anredeform – man sagt es zu einem Geliebten, zu einer verehrten Person. „Wahe Jio" ist also ein Ausruf der Liebe zur eigenen Seele: Wow, meine Seele! Es verbindet das Staunen über das Äußere (Guru) mit dem Staunen über das Innere (Jio).',
    wirkung: 'Öffnet das Herz, erzeugt Dankbarkeit, hebt die Stimmung. Verbindet mit der Seele als eigenem spirituellen Wesen.',
    praxis: 'Als Kirtan oder als schnelle Meditation mit Rhythmus. Schöne Praxis: Mit Musik, tanzend oder mit Armbewegungen.',
    aussprache: 'Waa-hey – Guh-roo – Waa-hey – Jee-oh.',
    verwandte: ['wahe-guru', 'pavan-guru', 'ang-sang-wahe-guru'],
  },
  {
    slug: 'wha-hey-guru',
    name: 'Wha-Hey Guru',
    subtitle: 'Das Mantra der Ekstase Gottes',
    kategorie: 'meditation',
    kurzbeschreibung: 'Eine Variante von Wahe Guru, die durch die besondere Aussprache des „Wha" eine stärkere Vibration im Herzchakra erzeugt.',
    lines: [
      { text: 'Wha', trans: 'Absolutheit, totales Staunen, der Klang selbst' },
      { text: 'Hey', trans: 'Anrede, Rufen' },
      { text: 'Guru', trans: 'Lehrer, der von Dunkel zu Licht führt' },
    ],
    bedeutung: 'In dieser Schreibweise wird die Aussprache betont: Das „Wha" soll tief aus dem Brustkorb kommen, wie ein Seufzen der Seele. Diese Variante wird in bestimmten Meditationen verwendet, wo die Herzöffnung besonders betont wird. Es ist kein anderes Mantra als Wahe Guru – nur eine andere Herangehensweise an denselben Klang.',
    wirkung: 'Öffnet das Herzchakra auf direktem Weg. Sehr gut bei emotionaler Starre oder wenn man Schwierigkeiten hat, das Herz zu öffnen.',
    praxis: 'In der liegenden Position (Savasana oder entspannt auf dem Rücken) besonders wirkungsvoll. 11 Minuten, jeder Klang aus dem Herzen.',
    aussprache: 'Wha (wie ein tiefer Seufzer, „W" fast wie „Wh" im Englischen) – Hey – Guh-roo.',
    verwandte: ['wahe-guru', 'ang-sang-wahe-guru', 'wahe-guru-wahe-jio'],
  },
  {
    slug: 'waheguru-simran',
    name: 'Waheguru Simran',
    subtitle: 'Stilles Wiederholung des Gottesnamens',
    kategorie: 'meditation',
    kurzbeschreibung: 'Simran bedeutet stille Erinnerung. Waheguru wird im Herzen wiederholt – eine tiefe Kontemplationspraxis aus dem Sikhismus.',
    lines: [
      { text: 'Waheguru', trans: 'Wow-Gott / Ekstatischer Lehrer – der Name des Unendlichen' },
    ],
    bedeutung: 'Simran (von Sanskrit „smaran" = sich erinnern) ist die Praxis der stillen, kontinuierlichen Erinnerung an Gott. Im Sikhismus ist Waheguru Simran die zentrale spirituelle Praxis – das ständige Wiederholen des Gottesnamens im Geist, im Rhythmus des Atems. Im Kundalini Yoga wird es als tiefe Kontemplation eingesetzt.',
    wirkung: 'Bringt den Geist in einen Zustand tiefer Stille und Präsenz. Über lange Zeit praktiziert entsteht ein kontinuierlicher Strom der Verbindung.',
    praxis: 'Keine formale Sitzposition nötig. Während alltäglicher Tätigkeiten: Waheguru mit jedem Atemzug. Oder formale Meditation: 31–62 Minuten in Stille.',
    aussprache: 'Waa-hey-goo-roo – alle vier Silben gleichwertig, kontinuierlich fließend.',
    verwandte: ['wahe-guru', 'sat-nam', 'ham-saa'],
  },
  {
    slug: 'naad-anu-naad',
    name: 'Naad Anu Naad',
    subtitle: 'Mantra des inneren Klangs',
    kategorie: 'meditation',
    kurzbeschreibung: 'Der Klang, der durch den Klang vibriert. Naad Yoga – das Yoga des heiligen Klangs – in zwei Worten.',
    lines: [
      { text: 'Naad', trans: 'Urklang, heiliger Klang, Vibration der Schöpfung' },
      { text: 'Anu Naad', trans: 'Dem Klang folgend, nach dem Klang, der Widerhall' },
    ],
    bedeutung: 'Naad ist der heilige Klang – die Vibration, aus der alles entstanden ist. Im vedischen Verständnis ist die gesamte Schöpfung aus Naad hervorgegangen (ähnlich wie im Johannes-Evangelium: „Im Anfang war das Wort"). Anu-Naad ist der Widerhall, die Antwort, das Echo des Urrklang im eigenen Bewusstsein. Dieses Mantra öffnet das Bewusstsein für Klang als spirituelle Praxis.',
    wirkung: 'Verfeinert die Wahrnehmung für subtile Klangebenen. Öffnet das 5. Chakra (Kehle), fördert Selbstausdruck und Zuhören.',
    praxis: 'Langsam und meditativ wiederholen, dabei innerlich auf subtile Klangebenen lauschen. 11 Minuten in Stille nach dem Singen.',
    aussprache: 'Naad (langer Vokal) – Ah-nu – Naad. Sehr fließend, wie eine Welle.',
    verwandte: ['ong', 'sa-ta-na-ma', 'waheguru-simran'],
  },

  // ── Schutz & Stärke ───────────────────────────────────────────────────────
  {
    slug: 'chattra-chakkra-vartee',
    name: 'Chattra Chakkra Vartee',
    subtitle: 'Mantra der Stärke und Courage',
    kategorie: 'schutz',
    kurzbeschreibung: 'Das Mantra, das Angst in Stärke verwandelt. Es aktiviert das zehnte Chakra (Aura) und das neutrale Feld des Herzens.',
    lines: [
      { text: 'Chattra Chakkra Vartee', trans: 'Du durchdringst alle Sphären überall' },
      { text: 'Chattra Chakkra Bhugvatay', trans: 'Du bist vollständig präsent in jedem Erfahrungsbereich' },
      { text: 'Suyambhav Subhang', trans: 'Du bist selbstleuchtend, herrlich und prächtig' },
      { text: 'Sarab Daa Saraab Jugatay', trans: 'Gib mir vollständige Stärke in allen Aspekten' },
      { text: 'Dukaalang Pranaasee', trans: 'Zerstörer der zweidimensionalen Zeit – des Leidens' },
      { text: 'Diaalang Saroopay', trans: 'Die Verkörperung des Mitgefühls' },
      { text: 'Sadaa Ang Sangay', trans: 'Immer mit mir, in jedem Teil meines Wesens' },
      { text: 'Abhangang Bibhootay', trans: 'Unzerstörbare Glorie' },
    ],
    bedeutung: 'Dieser Shabad stammt aus dem Jaap Sahib von Guru Gobind Singh – dem kriegerischen, mutigen Guru. Er ist ein Mantra für die Überwindung von Angst, Schwäche und Zögern. Yogi Bhajan lehrte ihn besonders für Männer und für Menschen, die in schwierigen Situationen Stärke brauchen.',
    wirkung: 'Überwindet Angst, Schwäche und Verwirrung. Stärkt die Aura, aktiviert das sechste und siebte Chakra. Gibt Mut in Zeiten der Bewährung.',
    praxis: 'Als abschließendes Mantra nach kraftvollen Kriyas. Aufrecht sitzen, Brust offen. Kräftig und mit Überzeugung singen. 11 Minuten.',
    aussprache: 'Chat-tra – Chak-kra – Var-tee. Betonung auf der ersten Silbe jedes Wortes. Kraftvoll und klar, nicht weich.',
    verwandte: ['gobinday-mukunday', 'aap-sahaee-hoa', 'sat-siri-siri-akal'],
  },
  {
    slug: 'sat-siri-siri-akal',
    name: 'Sat Siri Siri Akal',
    subtitle: 'Mantra der Unsterblichkeit',
    kategorie: 'schutz',
    kurzbeschreibung: 'Das Mantra, das an den Tod erinnert und dadurch von der Todesfurcht befreit. „Deathless" – unsterblich in der ewigen Gegenwart.',
    lines: [
      { text: 'Sat Siri', trans: 'Große Wahrheit, erhaben und groß' },
      { text: 'Siri Akal', trans: 'Große Unsterblichkeit / Timeless' },
      { text: 'Maha Akal', trans: 'Große, große Unsterblichkeit' },
      { text: 'Sat Nam', trans: 'Wahre Identität' },
      { text: 'Akal Murat', trans: 'Die unsterbliche Gestalt' },
      { text: 'Wahe Guru', trans: 'Ekstase des Göttlichen' },
    ],
    bedeutung: 'Akal bedeutet „nicht der Zeit unterworfen" – unsterblich, zeitlos. Dieses Mantra wird traditionell bei Sterbenden gesungen, um der Seele den Übergang zu erleichtern. Es erinnert uns, dass unser wahrstes Wesen den Tod überdauert. Durch regelmäßige Praxis löst es die Todesfurcht – und damit auch viele andere Ängste.',
    wirkung: 'Löst Todesfurcht und existenzielle Angst. Verbindet mit der unsterblichen Seele. Wird bei Übergangszeremonien, bei Trauer und bei terminalen Erkrankungen eingesetzt.',
    praxis: 'Gesungen oder als Stille-Meditation. Bei Todesnähe: Das Mantra ins Ohr flüstern oder laut im Raum singen. Als reguläre Praxis: 11 Minuten täglich.',
    aussprache: 'Sat – Sri (nicht „Si-ri") – Sri – Ah-kal. Maha: Ma-ha. Akal Murat: Ah-kal – Moo-rat.',
    verwandte: ['mul-mantra', 'chattra-chakkra-vartee', 'ek-ong-kar-sat-gur-prasad'],
  },
  {
    slug: 'laya-yoga-mantra',
    name: 'Ek Ong Kaar-aa Sat Naam-aa Siri Wha-Hay Guroo',
    subtitle: 'Laya Yoga Mantra – Erweckungsmantra',
    kategorie: 'schutz',
    kurzbeschreibung: 'Das tiefste Erweckungsmantra der Kundalini Yoga Tradition. Durch das „aa" am Ende jeder Silbe entsteht eine Pumpbewegung im Nabelzentrum.',
    lines: [
      { text: 'Ek Ong Kaar-aa', trans: 'Ein Schöpfer schafft alles – (aa = Nabelimpuls)' },
      { text: 'Sat Naam-aa', trans: 'Wahre Identität – (aa = Nabelimpuls)' },
      { text: 'Siri Wha-Hay Guroo', trans: 'Großartig – Wow-Gott' },
    ],
    bedeutung: 'Das Laya Yoga Mantra ist eine besondere Form von Ek Ong Kar Sat Nam Siri Wahe Guru, bei der jede Silbe mit einem Nabelimpuls (Mul Bandh) kombiniert wird. Das „aa" am Ende jeder Silbe zieht den Nabel in einer pumpenden Bewegung. Diese Technik erweckt die Kundalini-Energie direkt. Es gilt als eines der gefährlicheren Mantras – nicht wegen Schaden, sondern wegen seiner extremen Kraft.',
    wirkung: 'Erweckt Kundalini-Energie, öffnet alle sieben Chakren, verbindet mit der Seele. Transformative Erfahrungen möglich. Für fortgeschrittene Praktizierende.',
    praxis: 'Sitzen, aufrechter Rücken, Mul Bandh bei jedem „aa". Sehr langsam. Einen erfahrenen Lehrer konsultieren für die erste Praxis. 7–31 Minuten.',
    aussprache: 'Jedes „aa" ist ein kurzer Nabelimpuls. Ek-Ong-Kaar-AA (Pump) – Sat-Naam-AA (Pump) – Sri Wha-Hey Guh-roo.',
    verwandte: ['ek-ong-kar-sat-nam-siri-wahe-guru', 'ek-ong-kar-sat-gur-prasad', 'mul-mantra'],
  },
  {
    slug: 'waa-yantee',
    name: 'Waa Yantee Kar Yantee',
    subtitle: 'Mantra der kosmischen Schöpferkraft',
    kategorie: 'schutz',
    kurzbeschreibung: 'Ein altes tantrisches Mantra, das die Schöpferkraft Gottes und die Sehnsucht der Seele beschreibt.',
    lines: [
      { text: 'Waa Yantee', trans: 'Das Große Schöpferische' },
      { text: 'Kar Yantee', trans: 'Das Große Machende / Alles Erschaffende' },
      { text: 'Jag Dut Patee', trans: 'Herr der Welt' },
      { text: 'Aadak It Waahaa', trans: 'Und das ist WOW!' },
      { text: 'Brahmaadeh Traysha Guru', trans: 'Der Guru ist Brahma, Vishnu und Shiva' },
      { text: 'It Wahe Guru', trans: 'Und das ist Wahe Guru' },
    ],
    bedeutung: 'Waa Yantee ist ein tantrisches Mantra, das in der Kundalini Yoga Tradition von Yogi Bhajan gelehrt wurde. Es beschreibt die schöpferische Kraft des Universums und endet in dem Ausruf der Ekstase. Es wird in bestimmten Kriyas eingesetzt, um das Nabelzentrum zu aktivieren.',
    wirkung: 'Stärkt das dritte Chakra (Nabel), fördert Willenskraft und Schöpferkraft. Aktiviert das männliche Prinzip im Energiesystem.',
    praxis: 'Oft in Kriyas mit Nabelübungen. Kräftig und mit Schwung gesungen. 11 Minuten.',
    aussprache: 'Waa (langes „a") – Yan-tee – Kar – Yan-tee. Jag – Dut – Pa-tee. Fließend.',
    verwandte: ['har', 'gobinday-mukunday', 'chattra-chakkra-vartee'],
  },
  {
    slug: 'ek-ong-kar',
    name: 'Ek Ong Kar',
    subtitle: 'Das erste Mantra – Eine Schöpfung',
    kategorie: 'schutz',
    kurzbeschreibung: 'Drei Silben, die die gesamte Philosophie des Kundalini Yoga zusammenfassen: Es gibt einen Gott, und alles ist seine Schöpfung.',
    lines: [
      { text: 'Ek', trans: 'Eins – die Zahl Eins, die Einheit' },
      { text: 'Ong', trans: 'Der Schöpfer – aktives schöpferisches Bewusstsein' },
      { text: 'Kar', trans: 'Schöpfung – das Erschaffene, der Ausdruck' },
    ],
    bedeutung: 'Ek Ong Kar ist die erste Zeile des Mul Mantra und einer der fundamentalsten Aussagen der Sikh-Philosophie. Es erklärt: Es gibt eine einzige schöpferische Kraft, die sich in der gesamten Schöpfung ausdrückt. Nicht zwei Götter, nicht viele – Eins. Und dieser Eine ist nicht getrennt von der Schöpfung, sondern drückt sich durch sie aus.',
    wirkung: 'Verbindet mit dem Prinzip der Einheit. Löst Dualitätsdenken. Sehr kraftvolles Reinigungsmantra wenn auf einem langen Ausatem gesungen.',
    praxis: 'Als einzelnes Mantra auf einem langen Ausatem: Ek schnell und kurz – Ong lang (Vibration im Kopf) – Kar kurz. Wiederholen. 11 Minuten.',
    aussprache: 'Ek (sehr kurz) – Ong (lang, nasal, Vibration in Schädel) – Kar (kurz). Das Ong trägt fast die gesamte Zeit des Ausatems.',
    verwandte: ['mul-mantra', 'ong', 'ek-ong-kar-sat-gur-prasad'],
  },

  // ── Celestial Communication ───────────────────────────────────────────────
  {
    slug: 'gobinday-mukunday-celestial',
    name: 'Gobinday Mukunday (Celestial)',
    subtitle: 'Celestial Communication – Körper als Gebet',
    kategorie: 'celestial',
    kurzbeschreibung: 'Das Guru Gaitri Mantra als Celestial Communication – acht göttliche Aspekte ausgedrückt durch fließende Armbewegungen.',
    lines: [
      { text: 'Gobinday Mukunday Udaaray Apaaray', trans: 'Erhalter, Befreier, Erleuchter, Grenzenloser' },
      { text: 'Hariyang Kariyang Nirnamay Akamay', trans: 'Zerstörer, Schöpfer, Namenloser, Wunschloser' },
    ],
    bedeutung: 'Celestial Communication (Himmelssprache) ist eine Kundalini Yoga Praxis, bei der Mantras mit choreographierten Armbewegungen verbunden werden. Die Bewegungen kommen nicht aus dem Kopf – sie fließen spontan aus dem Herzen. Gobinday Mukunday ist als Celestial Communication besonders kraftvoll: Die acht Aspekte werden durch acht verschiedene Armbewegungsphrasen zum Ausdruck gebracht.',
    wirkung: 'Aktiviert beide Hemisphären gleichzeitig. Reinigt das elektromagnetische Feld (Aura). Befreit gespeicherte Emotionen durch Bewegung.',
    praxis: 'Im Stehen oder Sitzen. Augen geschlossen oder halb geöffnet. Die Arme bewegen sich frei und intuitiv mit dem Mantra. Kein Richtig oder Falsch. 11–31 Minuten.',
    aussprache: 'Wie beim originalen Gobinday Mukunday – zügig und rhythmisch.',
    verwandte: ['gobinday-mukunday', 'ong-so-hung', 'sa-re-sa-sa'],
  },
  {
    slug: 'ong-so-hung-celestial',
    name: 'Ong So Hung (Celestial)',
    subtitle: 'Celestial Communication – Schöpfer und Ich',
    kategorie: 'celestial',
    kurzbeschreibung: 'Das non-duale Mantra als Körpergebet. Armbewegungen drücken die Einheit von Schöpfer und Geschöpf aus.',
    lines: [
      { text: 'Ong So Hung', trans: 'Schöpfer – Das Absolute – Ich. Wir sind Eins.' },
    ],
    bedeutung: 'In der Celestial Communication-Form von Ong So Hung öffnen sich die Arme bei „Ong" weit (das Unendliche empfangen), ziehen sich bei „So" zur Mitte (das Absolute ist innen) und verbinden sich bei „Hung" am Herzen (ich bin Das). Die Bewegung selbst ist die Aussage des Mantras.',
    wirkung: 'Öffnet das Herzchakra und das Kronenchakra gleichzeitig. Sehr wirksam gegen das Gefühl der Getrenntheit.',
    praxis: 'Im Stehen, Füße schulterbreit. Drei typische Bewegungsphasen: Öffnen – Empfangen – Verbinden. Intuitiv, 11 Minuten.',
    aussprache: 'Wie bei Ong So Hung – Ong nasal, So lang, Hung nasal.',
    verwandte: ['ong-so-hung', 'gobinday-mukunday-celestial', 'sa-re-sa-sa-celestial'],
  },
  {
    slug: 'pavan-pavan-celestial',
    name: 'Pavan Pavan (Celestial)',
    subtitle: 'Celestial Communication – Tanz des Atems',
    kategorie: 'celestial',
    kurzbeschreibung: 'Das Prana-Mantra als fließende Körperpraxis. Die Armbewegungen imitieren den Fluss des Atems im Körper.',
    lines: [
      { text: 'Pavan Pavan Pavan Pavan Para Para', trans: 'Atem, Atem – jenseits aller Grenzen' },
      { text: 'Pavan Guru Wahe Guru Wahe Guru Wahe Jio', trans: 'Der Atem ist der Lehrer – Wow Seele' },
    ],
    bedeutung: 'Als Celestial Communication werden die fließenden Atemwellen durch wellenförmige Armbewegungen sichtbar gemacht. Das Mantra lehrt den Körper, Prana nicht nur zu atmen, sondern zu sein. Die Bewegungen repräsentieren die Ein- und Ausatmungswellen durch alle Körperschichten.',
    wirkung: 'Reinigt die Pranasheide (Pranamaya Kosha). Sehr ausgleichend bei Atemstörungen, Angst und Nervosität.',
    praxis: 'Wellenförmige Armbewegungen von unten nach oben (Einatmen) und von oben nach unten (Ausatmen). Sehr fließend, nie abgehackt. 11 Minuten.',
    aussprache: 'Wie bei Pavan Pavan – sanft und fließend.',
    verwandte: ['pavan-pavan', 'pavan-guru', 'ong-so-hung-celestial'],
  },
  {
    slug: 'sa-re-sa-sa-celestial',
    name: 'Sa Re Sa Sa (Celestial)',
    subtitle: 'Celestial Communication – Kosmischer Schutz in Bewegung',
    kategorie: 'celestial',
    kurzbeschreibung: 'Das Schutzmantra als Bewegungsmeditation. Die Hände zeichnen das unendliche Feld von Schutz und Wahrheit.',
    lines: [
      { text: 'Sa Re Sa Sa, Sa Re Sa Sa, Sa Re Sa Sa, Sa Rang', trans: 'Das Unendliche durchdringt alles – in der Wahrheit gefärbt' },
      { text: 'Har Re Har Har, Har Re Har Har, Har Re Har Har, Har Rang', trans: 'Die Schöpferkraft durchdringt alles' },
    ],
    bedeutung: 'Die Celestial Communication-Form von Sa Re Sa Sa verbindet den Aufwärtsschwung (Sa = Unendliches, empfangen) mit dem Herunterbringen (Har = erdende Schöpferkraft). Die Bewegungen schreiben buchstäblich das Schutzfeld in den Raum.',
    wirkung: 'Erstellt ein physisches Schutzfeld durch die Kombination von Mantra und Bewegung. Besonders wirkungsvoll für das Haus oder den Praxisraum.',
    praxis: 'Armbewegungen die Kreise beschreiben – nach oben auf „Sa", nach unten auf „Har". 11 Minuten. Kann auch zur Raumreinigung eingesetzt werden.',
    aussprache: 'Wie bei Sa Re Sa Sa – flüssig und rhythmisch.',
    verwandte: ['sa-re-sa-sa', 'aad-guray-nameh', 'pavan-pavan-celestial'],
  },
  {
    slug: 'sat-narayan-celestial',
    name: 'Sat Narayan Wahe Guru (Celestial)',
    subtitle: 'Celestial Communication – Wasser des Friedens',
    kategorie: 'celestial',
    kurzbeschreibung: 'Das Mantra der inneren Stille und des Friedens – in fließende Armbewegungen übersetzt, die an das Fließen des Wassers erinnern.',
    lines: [
      { text: 'Sat Narayan Wahe Guru', trans: 'Wahrer Erhalter – Wow Gott' },
      { text: 'Hari Narayan Sat Nam', trans: 'Heilender Erhalter – Wahre Identität' },
    ],
    bedeutung: 'Narayan ist mit dem Wasserelement verbunden – das Fließende, Nährende, Anpassungsfähige. Als Celestial Communication werden die Arme in fließenden, wellenförmigen Bewegungen geführt – wie Wasser, das sich um jeden Widerstand herum bewegt. Dieses Mantra ist besonders sanft und eignet sich für Menschen, die gerade in einer Lebensphase der Veränderung sind.',
    wirkung: 'Sanftes Lösen von Widerstand und Starrheit. Bringt Frieden und Akzeptanz. Gut nach schwierigen Ereignissen oder Trauer.',
    praxis: 'Sehr sanfte, wellenförmige Armbewegungen. Kein Druck, kein Tempo. 11 Minuten in vollständiger Entspannung.',
    aussprache: 'Wie bei Sat Narayan – weich und fließend.',
    verwandte: ['sat-narayan-wahe-guru', 'ong-so-hung-celestial', 'gobinday-mukunday-celestial'],
  },
];

// ─── PAGE GENERATORS ────────────────────────────────────────────────────────

function generateDetailPage(mantra) {
  const catLabel = CATEGORIES[mantra.kategorie] || mantra.kategorie;
  const catIcon = CAT_ICONS[mantra.kategorie] || '';
  const relatedLinks = (mantra.verwandte || [])
    .map(s => {
      const m = mantras.find(x => x.slug === s);
      if (!m) return '';
      return `<a href="/mantras/${s}" class="sidebar-card">${m.name}<span style="display:block;font-size:0.75rem;color:var(--c-text-muted);margin-top:2px;">${CATEGORIES[m.kategorie]}</span></a>`;
    }).filter(Boolean).join('\n          ');

  const linesTable = mantra.lines.map(l =>
    `<tr><td style="padding:var(--s-sm) var(--s-md) var(--s-sm) 0;font-family:'Cormorant Garamond',serif;font-size:1.1rem;font-style:italic;color:var(--c-text);white-space:nowrap;vertical-align:top;">${l.text}</td><td style="padding:var(--s-sm) 0;color:var(--c-text-soft);vertical-align:top;">${l.trans}</td></tr>`
  ).join('\n        ');

  const schemaFaq = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `Was bedeutet ${mantra.name}?`,
        "acceptedAnswer": { "@type": "Answer", "text": mantra.bedeutung }
      },
      {
        "@type": "Question",
        "name": `Wie praktiziere ich ${mantra.name}?`,
        "acceptedAnswer": { "@type": "Answer", "text": mantra.praxis }
      }
    ]
  }, null, 2);

  return `${HEAD(
    `${mantra.name} – Bedeutung, Aussprache & Wirkung | Kundalini Yoga Tribe`,
    `${mantra.kurzbeschreibung} Lerne Aussprache, Bedeutung und Wirkung von ${mantra.name} im Kundalini Yoga.`,
    `mantras/${mantra.slug}`,
    `<script type="application/ld+json">${schemaFaq}</script>`
  )}
${NAV}

  <header class="article-hero">
    <nav class="article-hero__breadcrumb" aria-label="Breadcrumb">
      <a href="/">Start</a> › <a href="/mantras">Mantras</a> › ${mantra.name}
    </nav>
    <span class="article-hero__tag">${catIcon} ${catLabel}</span>
    <h1>${mantra.name}<br><em>${mantra.subtitle}</em></h1>
  </header>

  <article class="article-content">

    <p style="font-size:1.15rem;color:var(--c-text-soft);">${mantra.kurzbeschreibung}</p>

    <h2>Mantra-Text & Übersetzung</h2>
    <div style="overflow-x:auto;margin:var(--s-lg) 0;background:var(--c-surface);border-radius:8px;padding:var(--s-lg);">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding-bottom:var(--s-sm);color:var(--c-text-muted);font-size:0.75rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:500;">Mantra</th>
            <th style="text-align:left;padding-bottom:var(--s-sm);color:var(--c-text-muted);font-size:0.75rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:500;">Bedeutung</th>
          </tr>
        </thead>
        <tbody>
        ${linesTable}
        </tbody>
      </table>
    </div>

    <h2>Bedeutung & Hintergrund</h2>
    <p>${mantra.bedeutung}</p>

    <h2>Wirkung</h2>
    <p>${mantra.wirkung}</p>

    <h2>Praxis & Anwendung</h2>
    <p>${mantra.praxis}</p>

    <h2>Aussprache</h2>
    <div style="background:var(--c-surface);border-left:3px solid var(--c-accent);padding:var(--s-md) var(--s-lg);border-radius:0 6px 6px 0;margin:var(--s-md) 0;">
      <p style="margin:0;font-family:'Cormorant Garamond',serif;font-size:1.05rem;">${mantra.aussprache}</p>
    </div>

    ${relatedLinks ? `
    <h2>Verwandte Mantras</h2>
    <div style="display:flex;flex-direction:column;gap:var(--s-sm);">
      ${relatedLinks}
    </div>` : ''}

    ${(() => {
      const vids = videoIndex[mantra.slug] || [];
      if (!vids.length) return '';
      const MAX = 6;
      const shown = vids.slice(0, MAX);
      const cards = shown.map(v => `
      <a href="/videos/${v.slug}" style="display:flex;gap:12px;align-items:center;background:var(--c-surface);border:1px solid var(--c-border);border-radius:8px;padding:12px;text-decoration:none;color:inherit;transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--c-accent)'" onmouseout="this.style.borderColor='var(--c-border)'">
        <img src="https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg" alt="${v.title}" style="width:100px;height:56px;object-fit:cover;border-radius:4px;flex-shrink:0;">
        <div style="flex:1;min-width:0;">
          <p style="font-size:0.9rem;font-weight:500;margin:0;line-height:1.3;color:var(--c-text);">${v.title}</p>
        </div>
      </a>`).join('');
      const more = vids.length > MAX ? `<p style="text-align:center;margin-top:var(--s-md);font-size:0.85rem;color:var(--c-text-muted);">+${vids.length - MAX} weitere Videos mit diesem Mantra</p>` : '';
      return `
    <h2>Videos mit diesem Mantra</h2>
    <p style="color:var(--c-text-soft);font-size:0.9rem;">In diesen Praxis-Videos wird ${mantra.name} verwendet – als Mitglied kannst du alle Videos in voller Länge sehen.</p>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:var(--s-md);">${cards}</div>
    ${more}
    <div style="text-align:center;margin-top:var(--s-xl);">
      <a href="/videos" style="display:inline-block;padding:10px 28px;background:var(--c-accent);color:#fff;border-radius:4px;font-size:0.9rem;text-decoration:none;font-weight:500;">Alle Videos ansehen</a>
    </div>`;
    })()}

    <div style="margin-top:var(--s-2xl);padding:var(--s-xl);background:var(--c-surface);border-radius:8px;text-align:center;">
      <p style="color:var(--c-text-muted);font-size:0.85rem;margin-bottom:var(--s-md);">Alle Mantras im Überblick</p>
      <a href="/mantras" style="display:inline-block;padding:var(--s-sm) var(--s-xl);background:var(--c-accent);color:#fff;border-radius:4px;font-size:0.9rem;text-decoration:none;">← Zur Mantra-Datenbank</a>
    </div>

  </article>

${FOOTER}
</body>
</html>`;
}

function generateIndexPage() {
  // Group by category
  const grouped = {};
  for (const [key, label] of Object.entries(CATEGORIES)) {
    grouped[key] = mantras.filter(m => m.kategorie === key);
  }

  const catFilters = Object.entries(CATEGORIES).map(([key, label]) =>
    `<button class="mantra-filter-btn" data-cat="${key}">${CAT_ICONS[key] || ''} ${label} <span class="mantra-count">${grouped[key].length}</span></button>`
  ).join('\n      ');

  const cards = mantras.map(m => {
    const catLabel = CATEGORIES[m.kategorie] || m.kategorie;
    const catIcon = CAT_ICONS[m.kategorie] || '';
    return `<a href="/mantras/${m.slug}" class="mantra-card" data-cat="${m.kategorie}">
        <span class="mantra-card__cat">${catIcon} ${catLabel}</span>
        <h3 class="mantra-card__name">${m.name}</h3>
        <p class="mantra-card__subtitle">${m.subtitle}</p>
        <p class="mantra-card__desc">${m.kurzbeschreibung}</p>
        <span class="mantra-card__link">Mehr erfahren →</span>
      </a>`;
  }).join('\n      ');

  const schemaItemList = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Kundalini Yoga Mantra-Datenbank",
    "description": "Alle wichtigen Mantras des Kundalini Yoga mit Bedeutung, Aussprache und Wirkung auf Deutsch.",
    "numberOfItems": mantras.length,
    "itemListElement": mantras.map((m, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": m.name,
      "url": `https://kundaliniyogatribe.de/mantras/${m.slug}`
    }))
  }, null, 2);

  return `${HEAD(
    `Mantra-Datenbank – ${mantras.length} Kundalini Yoga Mantras auf Deutsch | Kundalini Yoga Tribe`,
    `Die vollständige Kundalini Yoga Mantra-Datenbank: ${mantras.length} Mantras mit Bedeutung, Aussprache, Übersetzung und Wirkung auf Deutsch erklärt.`,
    'mantras',
    `<script type="application/ld+json">${schemaItemList}</script>
  <style>
    .mantra-hero { text-align:center; padding: var(--s-3xl) var(--s-xl) var(--s-2xl); }
    .mantra-hero h1 { margin: var(--s-md) 0; }
    .mantra-hero p { color: var(--c-text-soft); max-width:560px; margin:0 auto; }
    .mantra-filters { display:flex; flex-wrap:wrap; gap:var(--s-sm); justify-content:center; padding:var(--s-xl) var(--s-xl) 0; max-width:900px; margin:0 auto; }
    .mantra-filter-btn { padding: 6px 14px; border-radius:20px; border:1px solid var(--c-border); background:transparent; color:var(--c-text-soft); font-size:0.82rem; cursor:pointer; transition:all 0.2s; font-family:inherit; }
    .mantra-filter-btn:hover, .mantra-filter-btn.active { background:var(--c-accent); border-color:var(--c-accent); color:#fff; }
    .mantra-filter-btn.active { font-weight:600; }
    .mantra-count { opacity:0.7; font-size:0.75rem; margin-left:3px; }
    .mantra-search { display:flex; justify-content:center; padding:var(--s-lg) var(--s-xl) 0; max-width:500px; margin:0 auto; }
    .mantra-search input { width:100%; padding:10px 16px; border-radius:6px; border:1px solid var(--c-border); background:var(--c-surface); color:var(--c-text); font-size:0.95rem; font-family:inherit; outline:none; }
    .mantra-search input:focus { border-color:var(--c-accent); }
    .mantra-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:var(--s-lg); padding:var(--s-xl); max-width:1200px; margin:0 auto; }
    @media(max-width:900px){ .mantra-grid{ grid-template-columns:repeat(2,1fr); } }
    @media(max-width:600px){ .mantra-grid{ grid-template-columns:1fr; } }
    .mantra-card { display:flex; flex-direction:column; background:var(--c-surface); border:1px solid var(--c-border); border-radius:8px; padding:var(--s-lg); text-decoration:none; color:inherit; transition:border-color 0.2s, transform 0.2s; }
    .mantra-card:hover { border-color:var(--c-accent); transform:translateY(-2px); }
    .mantra-card__cat { font-size:0.72rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--c-accent); font-weight:600; margin-bottom:var(--s-xs); }
    .mantra-card__name { font-family:'Cormorant Garamond',serif; font-size:1.2rem; font-weight:500; margin:0 0 var(--s-xs); line-height:1.3; }
    .mantra-card__subtitle { font-size:0.78rem; color:var(--c-text-muted); margin:0 0 var(--s-sm); }
    .mantra-card__desc { font-size:0.85rem; color:var(--c-text-soft); flex:1; margin:0 0 var(--s-md); line-height:1.5; }
    .mantra-card__link { font-size:0.8rem; color:var(--c-accent); margin-top:auto; }
    .mantra-card.hidden { display:none; }
    .mantra-empty { grid-column:1/-1; text-align:center; padding:var(--s-3xl); color:var(--c-text-muted); }
    .cat-section-title { grid-column:1/-1; margin-top:var(--s-xl); padding-bottom:var(--s-sm); border-bottom:1px solid var(--c-border); font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--c-text-muted); font-weight:500; }
  </style>`
  )}
${NAV}

  <header class="mantra-hero">
    <span class="section__label">Nachschlagen</span>
    <h1>Mantra-Datenbank</h1>
    <p>${mantras.length} Kundalini Yoga Mantras – mit Bedeutung, Übersetzung, Aussprache und Wirkung auf Deutsch erklärt.</p>
  </header>

  <div class="mantra-search">
    <input type="search" id="mantraSearch" placeholder="Mantra suchen… z.B. Sat Nam, Heilung, Wahe Guru" autocomplete="off">
  </div>

  <div class="mantra-filters">
    <button class="mantra-filter-btn active" data-cat="all">Alle <span class="mantra-count">${mantras.length}</span></button>
    ${catFilters}
  </div>

  <div class="mantra-grid" id="mantraGrid">
    ${cards}
    <p class="mantra-empty" id="mantraEmpty" style="display:none;">Kein Mantra gefunden.</p>
  </div>

  <script>
    const cards = document.querySelectorAll('.mantra-card');
    const btns = document.querySelectorAll('.mantra-filter-btn');
    const search = document.getElementById('mantraSearch');
    const empty = document.getElementById('mantraEmpty');
    let activeCat = 'all';

    function filterCards() {
      const q = search.value.toLowerCase().trim();
      let visible = 0;
      cards.forEach(c => {
        const catMatch = activeCat === 'all' || c.dataset.cat === activeCat;
        const textMatch = !q || c.textContent.toLowerCase().includes(q);
        const show = catMatch && textMatch;
        c.classList.toggle('hidden', !show);
        if (show) visible++;
      });
      empty.style.display = visible === 0 ? 'block' : 'none';
    }

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCat = btn.dataset.cat;
        filterCards();
      });
    });

    search.addEventListener('input', filterCards);
  </script>

${FOOTER}
</body>
</html>`;
}

// ─── WRITE FILES ─────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, '../public/satnam');
const mantrasDir = path.join(outDir, 'mantras');

fs.mkdirSync(mantrasDir, { recursive: true });

// Index page
fs.writeFileSync(path.join(outDir, 'mantras.html'), generateIndexPage(), 'utf8');
console.log('✓ mantras.html');

// Detail pages
for (const mantra of mantras) {
  const file = path.join(mantrasDir, `${mantra.slug}.html`);
  fs.writeFileSync(file, generateDetailPage(mantra), 'utf8');
  console.log(`✓ mantras/${mantra.slug}.html`);
}

console.log(`\n✅ Generated ${mantras.length + 1} files (1 index + ${mantras.length} detail pages)`);
