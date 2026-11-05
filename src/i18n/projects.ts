// Dutch and Ukrainian text for the project entries in src/content/projects.
// English stays in the JSON files. Figure texts are listed in the same order
// as the entry's `figures`; the build fails if the counts differ.

type Text = { caption: string; alt: string };
export interface ProjectText {
  kind: string;
  summary: string;
  visualNote?: string;
  contextNote?: string;
  features?: { title: string; description: string }[];
  platformStatus?: { platform: string; status: string; version?: string }[];
  missing: string[];
  hero?: Text;
  cover?: Text;
  figures: Text[];
}

const same = (t: string): Text => ({ caption: t, alt: t });

export const PROJECT_TEXT: Record<"nl" | "uk", Record<string, ProjectText>> = {
  nl: {
    cookfrom: {
      kind: "Android-app",
      summary: "Kook met wat je al in huis hebt. Kies of fotografeer je ingrediënten en krijg een recept met hulp van AI dat je kunt aanpassen, bewaren en stap voor stap kunt volgen.",
      visualNote: "Schermen uit de Android-bèta. Het getoonde recept komt uit de ingebouwde catalogus en is niet net gegenereerd.",
      platformStatus: [
        {
          platform: "Android",
          status: "Live · Beschikbaar op Google Play",
          version: "0.12.0",
        },
        {
          platform: "iOS",
          status: "In testfase",
        },
      ],
      missing: [
        "Publieke release in de iOS App Store",
      ],
      hero: { caption: "CookFrom — Android-bèta", alt: "CookFrom: actuele app-schermen. Echte Android-bèta · 0.11.78." },
      cover: {
        caption: "CookFrom — promotiebeeld",
        alt: "Promotiebanner van CookFrom: het CookFrom-logo met de slogan “Good food. Less waste. More ideas.”, vier functies — AI-recepten van wat je hebt, voorraadkast, boodschappenlijst en voorkeuren — en een telefoon met een zoekscherm voor ingrediënten, naast verse tomaten, basilicum en knoflook.",
      },
      figures: [
        same("Kies ingrediënten uit de geïllustreerde catalogus."),
        same("Blader door de bestaande gerechtencatalogus."),
        same("Een ingebouwd recept voor Oekraïense borsjt met porties en ingrediënten."),
        same("Volg het recept stap voor stap tijdens het koken."),
      ],
    },
    "ops-planner": {
      kind: "Android-app",
      summary: "Een weekplanner om de taken, diensten en evenementen van een afdeling over medewerkers te verdelen — met werkdruk, vakanties en roosters die je kunt mailen. Alle gegevens blijven op je toestel.",
      visualNote: "Schermen uit een ontwikkelversie. Het team, de toewijzingen en de vakantie zijn fictieve voorbeeldgegevens.",
      missing: ["Link naar Google Play (de vermelding is nog niet openbaar)"],
      hero: { caption: "Ops Planner — ontwikkelversie met een fictief voorbeeldteam", alt: "Ops Planner: actuele app-schermen. Echte Android-interface · fictief voorbeeldteam." },
      cover: {
        caption: "Ops Planner — promotiebeeld",
        alt: "Promotiebanner van Ops Planner: het Ops Planner-logo, vijf functies — duidelijke planning, medewerkers beheren, taken en diensten, rapporten en export, overzicht en voortgang — en twee telefoons met de weekplanner en het medewerkerscherm.",
      },
      figures: [
        same("Dagelijkse takenpool en werkdruk, berekend uit fictieve toewijzingen."),
        same("Werkweekkeuze en werkdruk voor een fictief voorbeeldteam."),
        same("De weektoewijzingen van een medewerker in de echte roosterweergave."),
        same("Werktijden en een voorbeeld van een vakantieperiode."),
      ],
    },
    "ai-tutor": {
      kind: "Android-app",
      summary: "Een studie-assistent voor Android in ontwikkeling voor leerlingen van 9 tot 16 jaar: werk huiswerkopgaven stap voor stap uit met hints en alternatieve uitleg, in plaats van direct het eindantwoord te tonen.",
      visualNote: "Promotiecover en goedgekeurd Smart Notebook-ontwerp naast echte schermen uit de ingebouwde voorbeeldmodus (3x + 7 = 22). Live AI-antwoorden en foto-opgaven voor meerdere vakken zijn nog in ontwikkeling.",
      features: [
        {
          title: "Stap-voor-stap begeleiding",
          description: "Begeleidt leerlingen stap voor stap door een opgave in plaats van direct het eindantwoord te tonen.",
        },
        {
          title: "Hints & anders uitleggen",
          description: "Biedt opbouwende hints en een uitleg in andere woorden wanneer een leerling vastloopt bij een stap.",
        },
        {
          title: "Smart Notebook-stijl",
          description: "Goedgekeurd app-icoon met schrift en potlood en een schrift-interface voor leerlingen van 9 tot 16 jaar, met geplande invoer via foto en tekst.",
        },
        {
          title: "Ontwikkelstatus",
          description: "Momenteel in actieve ontwikkeling met een interactieve ingebouwde voorbeeldmodus; live AI-begeleiding, foto-invoer en meerdere vakken zijn nog niet productierijp.",
        },
      ],
      missing: [
        "Publieke release of vermelding in een appwinkel",
        "Productierijpe live AI-backend en foto-invoer voor opgaven (in ontwikkeling)",
      ],
      hero: {
        caption: "Homework Tutor — goedgekeurde Smart Notebook-stijl en schrift-met-potlood-icoon",
        alt: "Promotiebanner van Homework Tutor met het schrift-met-potlood-icoon, studiefuncties en de goedgekeurde Smart Notebook-schermen.",
      },
      cover: {
        caption: "Homework Tutor — promotiecover op basis van het goedgekeurde Smart Notebook-ontwerp en schrift-met-potlood-icoon.",
        alt: "Promotiebanner van Homework Tutor met het schrift-met-potlood-icoon, studiefuncties en de goedgekeurde Smart Notebook-schermen.",
      },
      figures: [
        {
          caption: "Goedgekeurd Concept 3 (“Smart Notebook”) UI-ontwerp en app-icoon met schrift en potlood.",
          alt: "Goedgekeurd Concept 3 Smart Notebook-ontwerpbord met het 48px Android-icoon met schrift en potlood, het startscherm en het spiraalschrift-menu.",
        },
        same("De eerste uitlegstap voor de ingebouwde voorbeeldvergelijking."),
        same("Hint van niveau 1 in het ingebouwde voorbeeld."),
        same("Anders uitleggen in de ingebouwde voorbeeldmodus; geen live AI-antwoord."),
        same("Het resultaat na beide stappen van het ingebouwde voorbeeld."),
      ],
    },
    "keyboard-trainer": {
      kind: "Webapp",
      summary: "Een typavontuur in de browser voor kinderen: leer blind typen in tien Typing Academy-lessen, overleef tijdsgolven in Word Rush en neem het op tegen King Typo op het vijfdelige Starwood Trail.",
      visualNote: "Authentieke schermafbeeldingen rechtstreeks uit de gepubliceerde KeyQuest-webapplicatie op keyquest-b9l7.onrender.com.",
      contextNote: "KeyQuest is ontwikkeld met deelname aan de Stripe Eindhoven Community-hackathon, verbonden aan One Horizon.",
      features: [
        {
          title: "Typing Academy (10 lessen)",
          description: "Stapsgewijze typcursus van de basisrij links en rechts tot de bovenste en onderste rij, hoofdletters met Shift, cijfers, leestekens en het eindexamen, met een kleurgecodeerd schermtoetsenbord.",
        },
        {
          title: "Word Rush-arcademodus",
          description: "Een golfmodus van 60 seconden met oplopende woordgolven, combo-multipliers en drie hartjes.",
        },
        {
          title: "Starwood Trail-avontuur",
          description: "Een avontuur van vijf etappes door Sunny Forest, Crystal Cave, Misty Bridge, Fire Mountain en Typo Castle tegen King Typo, waarbij getypte woorden aanvallen activeren.",
        },
        {
          title: "XP-levels, sterren & Trophy Shelf",
          description: "Verdien 1 tot 3 sterren per les op basis van WPM en nauwkeurigheid, verzamel XP in elke modus en ontgrendel 12 Trophy Shelf-prestaties.",
        },
        {
          title: "Lokale browseropslag & Web Audio",
          description: "Alle voortgang wordt lokaal in de browser bewaard zonder account of externe tracking, aangevuld met Web Audio-geluidseffecten en een geluidsknop.",
        },
      ],
      missing: [],
      hero: {
        caption: "KeyQuest — live webversie op keyquest-b9l7.onrender.com",
        alt: "Live webapplicatie van KeyQuest met Keyboard Kingdom-voortgang, Typing Academy, Word Rush, Typing Adventure en het overzicht van 10 lessen.",
      },
      cover: {
        caption: "KeyQuest — promotiebeeld",
        alt: "Promotiebanner van KeyQuest: het KeyQuest-icoon met toetsenbord en kroon, drie functies — 10 Typing Academy-lessen, Word Rush en Starwood Trail, en XP-levels met 12 trofeeën — de A S D F-toetsen en live schermen van Home Row Left en Sunny Forest.",
      },
      figures: [
        same("Het live startscherm van KeyQuest met Typing Academy, Word Rush en Typing Adventure."),
        same("De avonturenkaart van Starwood Trail met vijf etappes richting King Typo."),
        same("Actieve Typing Academy-les met gemarkeerde doeltoets en vingerzone-toetsenbord."),
        same("Starwood Trail-gevecht in Sunny Forest tegen Leaf Blob."),
      ],
    },
    agentlab: {
      kind: "Infrastructuurexperiment",
      summary: "Een experiment met infrastructuur voor AI-ontwikkeling: rollen voor plannen, bouwen en reviewen, met lokale inferentie achter een gateway die routering en validatie expliciet maakt.",
      visualNote: "Architectuurdiagrammen, geen schermafbeeldingen van een draaiend systeem. De rollen volgen uit een infrastructuuraudit van 3 oktober 2026.",
      missing: ["Schermafbeeldingen van een draaiende interface (nog niet gemaakt)"],
      hero: {
        caption: "AgentLab — gateway-architectuur",
        alt: "Huidige gateway-architectuur van AgentLab: deterministische L0-taken, lokale L1/L2-inferentie via Ollama, schemavalidatie, begrensde reparatie en telemetrie met alleen metadata. Bij een afwijzing door de guard wordt escalatie gevraagd zonder cloudaanroep.",
      },
      cover: same("Rollen in AgentLab: Claude als planner, Qwen/OpenCode als bouwer en een QA-/veiligheidsreviewer. De status is gebaseerd op de audit van 3 oktober 2026, niet op een nieuwe live controle."),
      figures: [
        {
          caption: "Workflowrollen — planner, bouwer en reviewer",
          alt: "Rollen in AgentLab: Claude als planner, Qwen/OpenCode als bouwer en een QA-/veiligheidsreviewer. De status is gebaseerd op de audit van 3 oktober 2026, niet op een nieuwe live controle.",
        },
      ],
    },
    "at-the-mountains-of-madness": {
      kind: "Game",
      summary: "Een game in actieve ontwikkeling. De beoogde beeldstijl: aquarel, ingetogen psychologische horror en een Antarctische expeditie in het niets naast monumentale oeroude ruïnes.",
      visualNote: "Concept art voor de beoogde stijl en sfeer van de game. Het is geen gameplay en toont geen inhoud die al in de game zit.",
      missing: ["Beschrijving van de game", "Platform", "Gameplay-schermafbeeldingen (nog geen)"],
      hero: {
        caption: "Antarctische expeditie op weg naar de oeroude ruïnes — beeldstijl in aquarel",
        alt: "Concept art in aquarel van een Antarctische expeditie die door een bevroren landschap trekt, op weg naar monumentale oeroude ruïnes in de bergen.",
      },
      cover: {
        caption: "Concept art — Antarctische expeditie op weg naar de oeroude ruïnes. Beeldstijl in aquarel voor At the Mountains of Madness.",
        alt: "Concept art in aquarel van een Antarctische expeditie die door een bevroren landschap trekt, op weg naar monumentale oeroude ruïnes in de bergen.",
      },
      figures: [],
    },
  },
  uk: {
    cookfrom: {
      kind: "Застосунок для Android",
      summary: "Готуйте з того, що вже є вдома. Виберіть або сфотографуйте інгредієнти й отримайте рецепт, складений за допомогою AI: його можна змінити, зберегти й готувати крок за кроком.",
      visualNote: "Екрани з бета-версії для Android. Показаний рецепт — із вбудованого каталогу, а не щойно згенерований.",
      platformStatus: [
        {
          platform: "Android",
          status: "Доступно · Опубліковано в Google Play",
          version: "0.12.0",
        },
        {
          platform: "iOS",
          status: "На тестуванні",
        },
      ],
      missing: [
        "Публічний реліз у iOS App Store",
      ],
      hero: { caption: "CookFrom — бета-версія для Android", alt: "CookFrom: актуальні екрани застосунку. Справжня бета-версія для Android · 0.11.78." },
      cover: {
        caption: "CookFrom — рекламне зображення",
        alt: "Рекламний банер CookFrom: логотип CookFrom зі слоганом “Good food. Less waste. More ideas.”, чотири функції — AI-рецепти з того, що є, комора, список покупок і вподобання — та телефон з екраном пошуку інгредієнтів поруч зі свіжими помідорами, базиліком і часником.",
      },
      figures: [
        same("Вибір інгредієнтів з ілюстрованого каталогу."),
        same("Перегляд наявного каталогу страв."),
        same("Вбудований рецепт українського борщу з порціями та інгредієнтами."),
        same("Приготування за рецептом крок за кроком."),
      ],
    },
    "ops-planner": {
      kind: "Застосунок для Android",
      summary: "Тижневий планувальник, щоб розподіляти завдання, чергування й події відділу між працівниками — з обліком навантаження, відпустками й розкладами, які можна надіслати поштою. Усі дані лишаються на вашому пристрої.",
      visualNote: "Екрани з робочої збірки. Команда, призначення й відпустка — вигадані приклади.",
      missing: ["Посилання на Google Play (сторінка ще не публічна)"],
      hero: { caption: "Ops Planner — робоча збірка з вигаданою командою", alt: "Ops Planner: актуальні екрани застосунку. Справжній інтерфейс Android · вигадана команда." },
      cover: {
        caption: "Ops Planner — рекламне зображення",
        alt: "Рекламний банер Ops Planner нідерландською: логотип Ops Planner, п'ять функцій — зрозуміле планування, керування працівниками, завдання й зміни, звіти та експорт, огляд і прогрес — і два телефони з тижневим планувальником та редактором працівника.",
      },
      figures: [
        same("Денний пул завдань і навантаження, пораховане з вигаданих призначень."),
        same("Вибір робочого тижня й навантаження вигаданої команди."),
        same("Тижневі призначення працівника у справжньому вікні розкладу."),
        same("Робочі години та приклад періоду відпустки."),
      ],
    },
    "ai-tutor": {
      kind: "Застосунок для Android",
      summary: "Навчальний помічник для Android у розробці для учнів 9–16 років: допомагає розв'язувати домашні завдання крок за кроком із підказками та поясненнями іншими словами, а не одразу показує відповідь.",
      visualNote: "Рекламна обкладинка й затверджений дизайн «Розумний Зошит» поряд зі справжніми екранами вбудованого демо-режиму (3x + 7 = 22). Живі відповіді AI та розпізнавання задач із фото ще в розробці.",
      features: [
        {
          title: "Покрокове розв'язання з підказками",
          description: "Веде учня через задачу по одному кроку замість того, щоб одразу відкривати кінцеву відповідь.",
        },
        {
          title: "Підказки та «Пояснити інакше»",
          description: "Пропонує багаторівневі підказки й альтернативні формулювання для поточного кроку.",
        },
        {
          title: "Візуальний стиль «Розумний Зошит»",
          description: "Затверджена іконка із зошитом і олівцем та інтерфейс у стилі зошита на спіралі для учнів 9–16 років із запланованим введенням задач із фото й тексту.",
        },
        {
          title: "Стан розробки",
          description: "Перебуває в активній розробці з інтерактивним вбудованим демо-режимом; живий AI-бекенд, фото-введення та підтримка кількох предметів ще не готові до продакшену.",
        },
      ],
      missing: [
        "Публічний реліз або сторінка в магазині застосунків",
        "Продакшен-версія живого AI-бекенду та розпізнавання задач із камери (у розробці)",
      ],
      hero: {
        caption: "Homework Tutor — затверджений візуальний стиль «Розумний Зошит» та іконка із зошитом і олівцем",
        alt: "Рекламний банер Homework Tutor із іконкою зошита й олівця, переліком можливостей та затвердженими екранами «Розумного Зошита».",
      },
      cover: {
        caption: "Homework Tutor — рекламна обкладинка на основі затвердженого дизайну «Розумний Зошит» та іконки із зошитом і олівцем.",
        alt: "Рекламний банер Homework Tutor із іконкою зошита й олівця, переліком можливостей та затвердженими екранами «Розумного Зошита».",
      },
      figures: [
        {
          caption: "Затверджений Концепт 3 («Розумний Зошит») — дизайн інтерфейсу та іконка застосунку із зошитом і олівцем.",
          alt: "Затверджений дизайн-борд Концепту 3 «Розумний Зошит» з Android-іконкою 48px (зошит і олівець), головним екраном і меню на спіралі.",
        },
        same("Перший крок пояснення для вбудованого прикладу рівняння."),
        same("Підказка першого рівня у вбудованому прикладі."),
        same("Пояснення іншими словами у вбудованому демо-режимі; без живої відповіді AI."),
        same("Результат після обох кроків вбудованого прикладу."),
      ],
    },
    "keyboard-trainer": {
      kind: "Веб-застосунок",
      summary: "Браузерна гра-пригода з навчання сліпого друку для дітей: десять уроків Typing Academy, швидкісні хвилі слів у Word Rush і битва з King Typo на п'яти етапах Starwood Trail.",
      visualNote: "Справжні скриншоти з опублікованої веб-версії KeyQuest на keyquest-b9l7.onrender.com.",
      contextNote: "KeyQuest розроблено за участі в хакатоні Stripe Eindhoven Community, пов'язаному з One Horizon.",
      features: [
        {
          title: "Typing Academy (10 уроків)",
          description: "Покроковий курс сліпого друку від домашнього ряду (ліва й права рука) до верхнього та нижнього рядів, великих літер із Shift, цифр, пунктуації та фінального іспиту з кольоровою екранною клавіатурою.",
        },
        {
          title: "Аркадний режим Word Rush",
          description: "60-секундний режим виживання зі зростаючими хвилями слів, множниками серій і трьома сердечками життя.",
        },
        {
          title: "Пригода Starwood Trail",
          description: "Кампанія з п'яти етапів (Sunny Forest, Crystal Cave, Misty Bridge, Fire Mountain і Typo Castle) проти King Typo, де набрані слова активують атаки героя.",
        },
        {
          title: "Рівні XP, зірки й Trophy Shelf",
          description: "Від 1 до 3 зірок за урок залежно від швидкості (WPM) і точності, накопичення XP у всіх режимах та 12 досягнень Trophy Shelf.",
        },
        {
          title: "Локальне збереження та Web Audio",
          description: "Увесь прогрес зберігається локально у браузері без реєстрації чи трекінгу, зі звуковими ефектами Web Audio та кнопкою вимкнення звуку.",
        },
      ],
      missing: [],
      hero: {
        caption: "KeyQuest — жива веб-версія на keyquest-b9l7.onrender.com",
        alt: "Жива веб-версія KeyQuest із прогресом Keyboard Kingdom, режимами Typing Academy, Word Rush, Typing Adventure та списком із 10 уроків.",
      },
      cover: {
        caption: "KeyQuest — рекламне зображення",
        alt: "Рекламний банер KeyQuest: іконка KeyQuest із клавіатурою та короною, три ключові можливості — 10 уроків Typing Academy, режими Word Rush і Starwood Trail, рівні XP і 12 трофеїв — клавіші A S D F та живі екрани Home Row Left і Sunny Forest.",
      },
      figures: [
        same("Головний екран живої веб-версії KeyQuest із режимами Typing Academy, Word Rush і Typing Adventure."),
        same("Карта пригоди Starwood Trail із п'ятьма етапами на шляху до King Typo."),
        same("Активний урок Typing Academy з підсвіченою цільовою клавішею та схемою зон пальців."),
        same("Битва на етапі Sunny Forest у режимі Starwood Trail проти Leaf Blob."),
      ],
    },
    agentlab: {
      kind: "Інфраструктурний експеримент",
      summary: "Експеримент з інфраструктурою для розробки за допомогою AI: ролі планування, побудови й перевірки, з локальним інференсом за шлюзом, який робить маршрутизацію й валідацію явними.",
      visualNote: "Архітектурні схеми, а не скриншоти робочої системи. Ролі відповідають інфраструктурному аудиту від 3 жовтня 2026 року.",
      missing: ["Скриншоти робочого інтерфейсу (ще не зроблені)"],
      hero: {
        caption: "AgentLab — архітектура шлюзу",
        alt: "Поточна архітектура шлюзу AgentLab: детерміновані завдання L0, локальний інференс L1/L2 через Ollama, перевірка за схемою, обмежене виправлення й телеметрія лише з метаданих. Якщо захист відхиляє запит, система просить ескалацію без звернення до хмари.",
      },
      cover: same("Ролі в AgentLab: Claude як планувальник, Qwen/OpenCode як виконавець і рецензент QA та безпеки. Стан базується на аудиті від 3 жовтня 2026 року, а не на новій перевірці."),
      figures: [
        {
          caption: "Ролі робочого процесу — планувальник, виконавець і рецензент",
          alt: "Ролі в AgentLab: Claude як планувальник, Qwen/OpenCode як виконавець і рецензент QA та безпеки. Стан базується на аудиті від 3 жовтня 2026 року, а не на новій перевірці.",
        },
      ],
    },
    "at-the-mountains-of-madness": {
      kind: "Гра",
      summary: "Гра в активній розробці. Задуманий візуальний стиль: акварель, стриманий психологічний горор і антарктична експедиція, крихітна поруч із велетенськими прадавніми руїнами.",
      visualNote: "Концепт-арт задуманого стилю й атмосфери гри. Це не геймплей і не вміст, який уже є в грі.",
      missing: ["Опис гри", "Платформа", "Скриншоти геймплею (поки немає)"],
      hero: {
        caption: "Антарктична експедиція наближається до прадавніх руїн — акварельний візуальний стиль",
        alt: "Акварельний концепт-арт: антарктична експедиція йде крижаною пустелею до велетенських прадавніх руїн у горах.",
      },
      cover: {
        caption: "Концепт-арт — антарктична експедиція наближається до прадавніх руїн. Акварельний візуальний стиль для At the Mountains of Madness.",
        alt: "Акварельний концепт-арт: антарктична експедиція йде крижаною пустелею до велетенських прадавніх руїн у горах.",
      },
      figures: [],
    },
  },
};

/** Dutch and Ukrainian titles for the entries in src/content/updates.json. */
export const UPDATE_TEXT: Record<"nl" | "uk", Record<string, string>> = {
  nl: {
    "2026-11-05-cookfrom-google-play": "CookFrom voor Android is nu beschikbaar op Google Play (v0.12.0); de iOS-versie is in testfase.",
    "2026-11-04-portfolio-refresh": "KeyQuest live-webversie gepubliceerd, Homework Tutor Smart Notebook-ontwerp toegevoegd en CookFrom platformstatus voor Android en iOS bijgewerkt.",
    "2026-10-04-mountains-concept-art": "Concept art toegevoegd voor At the Mountains of Madness, die de beoogde beeldstijl vastlegt.",
    "2026-10-03-project-visuals": "Echte app-schermen toegevoegd voor CookFrom, Ops Planner, AI Tutor en Keyboard Trainer, en architectuurdiagrammen voor AgentLab.",
    "2026-10-03-new-projects": "AI Tutor, Keyboard Trainer, AgentLab en At the Mountains of Madness staan nu op HomeLabCore.",
    "2026-09-24-ops-planner": "Productpagina, privacybeleid en supportpagina van Ops Planner gepubliceerd.",
    "2026-09-01-cookfrom": "Productpagina, privacybeleid en supportpagina van CookFrom gepubliceerd.",
  },
  uk: {
    "2026-11-05-cookfrom-google-play": "CookFrom для Android опубліковано в Google Play (v0.12.0); версія для iOS перебуває на тестуванні.",
    "2026-11-04-portfolio-refresh": "Опубліковано живу веб-версію KeyQuest, додано дизайн «Розумний Зошит» для Homework Tutor та оновлено статус платформ Android та iOS для CookFrom.",
    "2026-10-04-mountains-concept-art": "Додано концепт-арт для At the Mountains of Madness, який задає візуальний стиль гри.",
    "2026-10-03-project-visuals": "Додано справжні екрани CookFrom, Ops Planner, AI Tutor і Keyboard Trainer, а також архітектурні схеми AgentLab.",
    "2026-10-03-new-projects": "AI Tutor, Keyboard Trainer, AgentLab і At the Mountains of Madness тепер на HomeLabCore.",
    "2026-09-24-ops-planner": "Опубліковано сторінку продукту, політику конфіденційності й сторінку підтримки Ops Planner.",
    "2026-09-01-cookfrom": "Опубліковано сторінку продукту, політику конфіденційності й сторінку підтримки CookFrom.",
  },
};
