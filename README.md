# Лекарства — Смоленск / Минск

Сравнение цен и ссылок на покупку курса в двух городах:

- Ликомаст 60 капс. (2× №30)
- Пробиотик (предпочтение: Бактистатин №60)
- Урсосан 250 мг / аналоги на ~180 капс.
- Магния хелат 400–600 мг/день на 2 месяца
- Бронхо-мунал 7 мг №30

Переключатель города на странице: Смоленск (₽) и Минск (Br).

## Запуск

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 43127
```

Откройте http://127.0.0.1:43127

## Обновление цен

Цены подтягиваются в `public/data/prices.json` (Мегаптека, tabletka.by, Апрель на 009.рф, НБРБ).

```bash
npm run update-prices   # собрать свежий prices.json
npm run build
npm run deploy:gh       # нужен GH_TOKEN → GitHub Pages
```

Сайт читает `prices.json` при открытии. Расписание: workflow `Update prices daily` (нужен push с правом `workflow`).

## GitHub Pages (доступ через веб)

1. Создайте репозиторий на GitHub и запушьте `main`.
2. Settings → Pages → **Source: GitHub Actions**.
3. После пуша workflow `Deploy GitHub Pages` соберёт сайт.
4. URL будет вида: `https://<user>.github.io/<repo>/`

Локальная проверка сборки: `npm run build && npm run preview`.

## Источники

- РФ (Смоленск): [Мегаптека](https://megapteka.ru/smolensk), [Apteka.ru](https://apteka.ru/) (в т.ч. наборы 1+1), 009.рф, Ютека, Здравсити
- РБ (Минск): tabletka.by, 103.by

Цены ориентировочные. Перед покупкой уточняйте наличие.
