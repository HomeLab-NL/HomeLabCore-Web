---
title: "KeyQuest live webimplementatie & functies"
description: "KeyQuest is nu live op het web met tien Typing Academy-lessen, een 60-seconden Word Rush-modus, het Starwood Trail-avontuur en lokale voortgang."
published: "2026-10-28"
category: "release"
project: "keyboard-trainer"
version: "1.0.0"
lang: "nl"
tags:
  - "KeyQuest"
  - "Web app"
  - "React"
  - "Education"
sourceEventId: "homelabnl-alt/KeyQuest#deployment:2026-10-28"
sourceUrl: "https://github.com/homelabnl-alt/KeyQuest"
---

KeyQuest (oorspronkelijk geprototyped onder de werktitel Keyboard Trainer) is nu geïmplementeerd als live browsertoepassing op [keyquest-b9l7.onrender.com](https://keyquest-b9l7.onrender.com/).

## Wat is inbegrepen in de live build

- **Typing Academy (10 lessen):** Een gestructureerd leertraject van de basisrij links (`A S D F`) en rechts (`J K L ;`) via volledige basisrijwoorden, bovenste rij (`Q W E R T Y U I O P`), onderste rij (`Z X C V B N M`), hoofdletters met Shift, cijfers, interpunctie, snelheidsoefeningen en het eindexamen. Elke les toont een interactief toetsenbord met kleurzones voor vingers en live WPM/nauwkeurigheidsweergave.
- **Word Rush:** Een getimede overlevingsmodus van 60 seconden met escalerende woordgolven, streak-combovermenigvuldigers en een teller met drie levens.
- **Starwood Trail (Type-avontuur):** Een verhaalquest in vijf fasen door Sunny Forest, Crystal Cave, Misty Bridge, Fire Mountain en Typo Castle tegen King Typo. Elk voltooid woord activeert een heldenaanval voordat de aanvalstimer van het monster vol is.
- **Voortgang & trofeeënplank:** Spelers verdienen 1–3 sterren per les op basis van nauwkeurigheids- en WPM-doelen, verzamelen XP in alle modi en ontgrendelen 12 prestaties op de trofeeënplank.
- **Lokale opslag & Web Audio:** Alle voortgang wordt lokaal in de browser opgeslagen (`localStorage`) zonder registratie of externe tracking, vergezeld van gesynthetiseerde Web Audio-geluidseffecten en een geluidsschakelaar in de header.

## Hackathon-context

KeyQuest is ontwikkeld met deelname aan de Stripe Eindhoven Community-hackathon in samenwerking met One Horizon.

