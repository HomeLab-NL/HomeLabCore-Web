// Dutch and Ukrainian text for the project entries in src/content/projects.
// English stays in the JSON files. Figure texts are listed in the same order
// as the entry's `figures`; the build fails if the counts differ.

type Text = { caption: string; alt: string };
export interface ProjectText {
  kind: string;
  summary: string;
  visualNote?: string;
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
      missing: ["Link naar Google Play (de vermelding is nog niet openbaar)"],
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
      summary: "Een Android-app in ontwikkeling die leerlingen stap voor stap door wiskundesommen helpt — met hints en anders uitleggen — in plaats van meteen het antwoord te geven.",
      visualNote: "Getoond in de ingebouwde voorbeeldmodus van de app met de voorbeeldsom 3x + 7 = 22 — dit zijn geen live AI-antwoorden. De app toont nu nog de ontwikkelnaam Homework Tutor.",
      missing: ["Publieke release of vermelding in een appwinkel"],
      hero: { caption: "AI Tutor — ingebouwde voorbeeldmodus", alt: "AI Tutor: actuele app-schermen. Echte app-interface · ingebouwde voorbeeldmodus." },
      cover: same("AI Tutor: voer een wiskundesom in de echte app in; ingebouwd voorbeeld getoond."),
      figures: [
        same("De eerste uitlegstap voor de ingebouwde voorbeeldvergelijking."),
        same("Hint van niveau 1 in het ingebouwde voorbeeld."),
        same("Anders uitleggen in de ingebouwde voorbeeldmodus; geen live AI-antwoord."),
        same("Het resultaat na beide stappen van het ingebouwde voorbeeld."),
      ],
    },
    "keyboard-trainer": {
      kind: "Webapp",
      summary: "Een typspel voor kinderen van 6 tot 12 jaar, gemaakt voor de computer: tien toetsenbordopdrachten die steeds moeilijker worden, met sterren, XP en munten om te verdienen. De voortgang wordt alleen in de browser opgeslagen.",
      visualNote: "Schermen uit de huidige ontwikkelversie, die de werktitel KeyQuest draagt.",
      missing: ["Publiek webadres (nog niet online)", "Definitieve productnaam (de app toont nu de werktitel KeyQuest)"],
      hero: { caption: "Keyboard Trainer — ontwikkelversie (werktitel KeyQuest)", alt: "KeyQuest: actuele app-schermen. Echte browserapp · ontwikkelversie." },
      cover: same("KeyQuest: de eerste typopdracht met de gemarkeerde doeltoets."),
      figures: [
        same("Het huidige startscherm van KeyQuest."),
        same("De echte questkaart met tien levels, in de beginstand."),
        same("De eerste typopdracht met de gemarkeerde doeltoets."),
        same("Een resultaat behaald met de echte eerste opdracht; alleen een voorbeeldsessie."),
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
      missing: ["Посилання на Google Play (сторінка ще не публічна)"],
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
      summary: "Застосунок для Android у розробці, який допомагає учням розв'язувати задачі з математики крок за кроком — з підказкою і поясненням іншими словами — замість того, щоб одразу показувати відповідь.",
      visualNote: "Показано у вбудованому демо-режимі застосунку на прикладі 3x + 7 = 22 — це не живі відповіді AI. Застосунок поки має робочу назву Homework Tutor.",
      missing: ["Публічний реліз або сторінка в магазині застосунків"],
      hero: { caption: "AI Tutor — вбудований демо-режим", alt: "AI Tutor: актуальні екрани застосунку. Справжній інтерфейс · вбудований демо-режим." },
      cover: same("AI Tutor: введення задачі з математики у справжньому застосунку; показано вбудований приклад."),
      figures: [
        same("Перший крок пояснення для вбудованого прикладу рівняння."),
        same("Підказка першого рівня у вбудованому прикладі."),
        same("Пояснення іншими словами у вбудованому демо-режимі; без живої відповіді AI."),
        same("Результат після обох кроків вбудованого прикладу."),
      ],
    },
    "keyboard-trainer": {
      kind: "Веб-застосунок",
      summary: "Гра для дітей 6–12 років, щоб навчитися друкувати, розрахована на комп'ютер: десять завдань на клавіатурі зі зростаючою складністю, зірки, XP і монети за проходження. Прогрес зберігається лише в браузері.",
      visualNote: "Екрани з поточної робочої збірки під робочою назвою KeyQuest.",
      missing: ["Публічна веб-адреса (ще не розгорнуто)", "Остаточна назва продукту (зараз застосунок показує робочу назву KeyQuest)"],
      hero: { caption: "Keyboard Trainer — робоча збірка (робоча назва KeyQuest)", alt: "KeyQuest: актуальні екрани застосунку. Справжній браузерний застосунок · робоча збірка." },
      cover: same("KeyQuest: перше завдання з підсвіченою клавішею."),
      figures: [
        same("Поточний головний екран KeyQuest."),
        same("Справжня карта з десяти рівнів у початковому стані."),
        same("Перше завдання з підсвіченою клавішею."),
        same("Результат за проходження справжнього першого завдання; лише тестова сесія."),
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
    "2026-10-04-mountains-concept-art": "Concept art toegevoegd voor At the Mountains of Madness, die de beoogde beeldstijl vastlegt.",
    "2026-10-03-project-visuals": "Echte app-schermen toegevoegd voor CookFrom, Ops Planner, AI Tutor en Keyboard Trainer, en architectuurdiagrammen voor AgentLab.",
    "2026-10-03-new-projects": "AI Tutor, Keyboard Trainer, AgentLab en At the Mountains of Madness staan nu op HomeLabCore.",
    "2026-09-24-ops-planner": "Productpagina, privacybeleid en supportpagina van Ops Planner gepubliceerd.",
    "2026-09-01-cookfrom": "Productpagina, privacybeleid en supportpagina van CookFrom gepubliceerd.",
  },
  uk: {
    "2026-10-04-mountains-concept-art": "Додано концепт-арт для At the Mountains of Madness, який задає візуальний стиль гри.",
    "2026-10-03-project-visuals": "Додано справжні екрани CookFrom, Ops Planner, AI Tutor і Keyboard Trainer, а також архітектурні схеми AgentLab.",
    "2026-10-03-new-projects": "AI Tutor, Keyboard Trainer, AgentLab і At the Mountains of Madness тепер на HomeLabCore.",
    "2026-09-24-ops-planner": "Опубліковано сторінку продукту, політику конфіденційності й сторінку підтримки Ops Planner.",
    "2026-09-01-cookfrom": "Опубліковано сторінку продукту, політику конфіденційності й сторінку підтримки CookFrom.",
  },
};
