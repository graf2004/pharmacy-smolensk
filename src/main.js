import './style.css'

let updated = '15.09.2026'
let pricesMeta = { status: 'static', updatedAt: null }

/** НБРБ: 100 RUB = Cur_OfficialRate BYN. Fallback на курс от 15.09.2026. */
const NBRB_RUB_FALLBACK = { scale: 100, rate: 3.6095, date: '2026-09-15' }

/** Fallback, пока не подтянулся /data/prices.json (собирается scripts/update-prices.mjs). */
let compareRows = [
  {
    name: 'Ликомаст 60 капс. (2×№30)',
    ruRub: 1684,
    ruNote: 'Мегаптека / АптекаПлюс от 841,8×2',
    byn: 68.0,
    byNote: 'tabletka.by от 34,00×2',
    ruUrl: 'https://megapteka.ru/smolensk/catalog/akusherstvo-ginekologiya-43/likomast-kaps-n-43543',
    byUrl: 'https://tabletka.by/result/?ls=104159',
  },
  {
    name: 'Бактистатин №60',
    ruRub: 1103,
    ruNote: 'Apteka.ru №60; набор 1+1 №60 — 1 846 ₽ (120 капс.)',
    byn: 67.02,
    byNote: 'tabletka.by от 67,02',
    ruUrl: 'https://apteka.ru/product/baktistatin-60-sht-kapsuly-massoj-05-g-5e3263d7ca7bdc000192ac08/',
    byUrl: 'https://tabletka.by/result/?ls=108629',
  },
  {
    name: 'Пробиолог Форте 60 (2×№30)',
    ruRub: 1668,
    ruNote: 'Апрель клуб 834×2',
    byn: 66.26,
    byNote: 'tabletka.by от 33,13×2',
    ruUrl: 'https://009.xn--p1ai/smolensk/product/probiolog_forte_kapsuly_227_mg_n30',
    byUrl: 'https://tabletka.by/result/?ls=107990',
  },
  {
    name: 'Бак-Сет Форте 60 (3×№20)',
    ruRub: 1650,
    ruNote: 'Ютека от 550×3; набор Apteka.ru 2×№20 — 1 374 ₽',
    byn: 83.04,
    byNote: 'tabletka.by от 27,68×3',
    ruUrl: 'https://megapteka.ru/smolensk/catalog/zabolevaniya-zhkt-52/bak-set-forte-kaps-45712',
    byUrl: 'https://tabletka.by/result/?ls=105672',
  },
  {
    name: 'Урсосан ~180 капс. 250 мг',
    ruRub: 2825,
    ruNote: 'Апрель клуб: 1516+787+3×174',
    byn: 212.0,
    byNote: 'tabletka.by 4×№50 от 53,00',
    ruUrl: 'https://009.xn--p1ai/smolensk/kupit-ursosan',
    byUrl: 'https://tabletka.by/result/?ls=30749',
  },
  {
    name: 'Урсосан аналог (дешёвый УДХК)',
    ruRub: null,
    ruNote: '—',
    byn: 71.28,
    byNote: 'Урсаклин №60×3, tabletka.by от 23,76',
    ruUrl: null,
    byUrl: 'https://tabletka.by/result/?ls=18217',
  },
  {
    name: 'Магний хелат (~400 мг элем./день, 2 мес.)',
    ruRub: 1860,
    ruNote: 'Мегаптека GLS Max №120×2 от 930',
    byn: 66.38,
    byNote: 'GLS Max №120×2, tabletka.by от 33,19',
    ruUrl: 'https://megapteka.ru/smolensk/catalog/vitaminy-i-mikroelementy-49/magnij-helat-gls-4789514',
    byUrl: 'https://tabletka.by/result/?ls=119811',
  },
  {
    name: 'Бронхо-мунал 7 мг №30',
    ruRub: 1748,
    ruNote: '009.рф Смоленск от / Мегаптека от 1815',
    byn: 74.19,
    byNote: 'tabletka.by 3×№10 от 24,73 (№30 в РБ нет)',
    ruUrl: 'https://009.xn--p1ai/smolensk/product/bronho-munal_kapsuly_7_mg_n30',
    byUrl: 'https://tabletka.by/result/?ls=1974',
  },
]

function rubToByn(rub, fx) {
  return (rub * fx.rate) / fx.scale
}

function fmtByn(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Br'
}

function fmtRub(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString('ru-RU') + ' ₽'
}

async function loadNbrbRate() {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 2500)
  try {
    const res = await fetch('https://www.nbrb.by/api/exrates/rates/456', {
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(String(res.status))
    const data = await res.json()
    return {
      scale: data.Cur_Scale,
      rate: data.Cur_OfficialRate,
      date: String(data.Date).slice(0, 10),
    }
  } catch {
    return { ...NBRB_RUB_FALLBACK }
  } finally {
    clearTimeout(timer)
  }
}

function formatUpdatedLabel(iso) {
  if (!iso) return updated
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return updated
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtPackRub(n) {
  if (n == null) return null
  return Math.round(n).toLocaleString('ru-RU')
}

function applyLivePrices(data) {
  if (!data?.compare?.length) return
  compareRows = data.compare.map((row) => ({
    name: row.name,
    ruRub: row.ruRub,
    ruNote: row.ruNote,
    byn: row.byn,
    byNote: row.byNote,
    ruUrl: row.ruUrl,
    byUrl: row.byUrl,
  }))
  pricesMeta = {
    status: 'live',
    updatedAt: data.updatedAt,
    sources: data.sources,
  }
  updated = formatUpdatedLabel(data.updatedAt)

  const h = data.highlights || {}
  const sm = cities.smolensk
  if (h.likomastRuPack != null) {
    const course = Math.round(h.likomastRuPack * 2)
    sm.summary[0] = {
      title: 'Ликомаст №30 × 2',
      price: `от ~${fmtPackRub(course)} ₽`,
      href: compareRows[0]?.ruUrl,
    }
  }
  if (h.baktistatinRu != null) {
    sm.summary[1] = {
      title: 'Бактистатин №60 (Мегаптека)',
      price: `от ${fmtPackRub(h.baktistatinRu)} ₽`,
      href: compareRows[1]?.ruUrl,
    }
  }
  if (h.aprilUrsosan != null) {
    sm.summary[2] = {
      title: 'Урсосан 180 капс. — Апрель клуб',
      price: `от ${fmtPackRub(h.aprilUrsosan)} ₽`,
      href: 'https://009.xn--p1ai/smolensk/kupit-ursosan',
    }
    sm.summaryTotal = `ориентир обновлён ${updated} (Урсосан клуб ~${fmtPackRub(h.aprilUrsosan)} ₽)`
  }
  if (h.glsMaxRuPack != null) {
    sm.summary[3] = {
      title: 'GLS Max №120 × 2 (~400 мг/день)',
      price: `от ~${fmtPackRub(h.glsMaxRuPack * 2)} ₽`,
      href: compareRows[6]?.ruUrl,
    }
  }

  const by = cities.minsk
  if (h.likomastBy != null) {
    by.summary[0] = {
      title: 'Ликомаст №30 × 2',
      price: `от ~${String((h.likomastBy * 2).toFixed(2)).replace('.', ',')} Br`,
      href: compareRows[0]?.byUrl,
    }
  }
  if (h.baktistatinBy != null) {
    by.summary[1] = {
      title: 'Бактистатин №60',
      price: `от ~${String(h.baktistatinBy).replace('.', ',')} Br`,
      href: compareRows[1]?.byUrl,
    }
  }
  if (h.ursosan50By != null) {
    by.summary[2] = {
      title: 'Урсосан 250 мг №50 ×4 (~200 капс.)',
      price: `от ~${String((h.ursosan50By * 4).toFixed(2)).replace('.', ',')} Br`,
      href: compareRows[4]?.byUrl,
    }
  }
  if (h.glsMaxBy != null) {
    by.summary[3] = {
      title: 'GLS Maximum №120 ×2 (100 мг×4 = 400 мг)',
      price: `от ~${String((h.glsMaxBy * 2).toFixed(2)).replace('.', ',')} Br`,
      href: compareRows[6]?.byUrl,
    }
  }

  const patchOption = (cityKey, groupName, matchFn, price, detail) => {
    const group = cities[cityKey].rows.find((g) => g.name === groupName)
    if (!group) return
    const opt = group.options.find(matchFn)
    if (!opt) return
    if (price) opt.price = price
    if (detail) opt.detail = detail
  }
  if (h.likomastRuPack != null) {
    patchOption(
      'smolensk',
      'Ликомаст',
      (o) => o.title.startsWith('Ликомаст №30 × 2') && /Мегаптека|АптекаПлюс/.test(o.where),
      `от ${fmtPackRub(h.likomastRuPack * 2)} ₽`,
      `Мегаптека от ${h.likomastRuPack} ₽ × 2`,
    )
  }
  if (h.baktistatinRu != null) {
    patchOption(
      'smolensk',
      'Пробиотик',
      (o) => o.title.startsWith('Бактистатин №60') && o.where.includes('Мегаптека'),
      `от ${fmtPackRub(h.baktistatinRu)} ₽`,
      'живой прайс Мегаптека Смоленск',
    )
  }
  if (h.aprilUrsosan != null) {
    patchOption(
      'smolensk',
      'Урсосан / аналог',
      (o) => o.title.startsWith('Урсосан: №100 + №50 + 3×№10') && o.where.includes('Апрель'),
      `${fmtPackRub(h.aprilUrsosan)} ₽`,
      'Апрель клуб, обновлено автоматически',
    )
  }
  if (h.likomastBy != null) {
    patchOption(
      'minsk',
      'Ликомаст',
      (o) => o.title.startsWith('Ликомаст №30 × 2'),
      `от ${String((h.likomastBy * 2).toFixed(2)).replace('.', ',')} Br`,
      `tabletka.by от ${String(h.likomastBy).replace('.', ',')} × 2`,
    )
  }
  if (h.baktistatinBy != null) {
    patchOption(
      'minsk',
      'Пробиотик',
      (o) => o.title.startsWith('Бактистатин №60'),
      `от ${String(h.baktistatinBy).replace('.', ',')} Br`,
      'tabletka.by, обновлено автоматически',
    )
  }
}

async function loadPrices() {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 4000)
  try {
    const res = await fetch(`./data/prices.json?t=${Date.now()}`, { signal: ctrl.signal })
    if (!res.ok) throw new Error(String(res.status))
    const data = await res.json()
    applyLivePrices(data)
    return data
  } catch (e) {
    pricesMeta = { status: 'fallback', updatedAt: null, error: String(e.message || e) }
    return null
  } finally {
    clearTimeout(timer)
  }
}

const cities = {
  smolensk: {
    id: 'smolensk',
    label: 'Смоленск',
    currency: '₽',
    clubNote:
      'Цены «Апрель» — клуб «Апрель + Аптечный клуб» (на 009.рф обычная цена зачёркнута). Отдельных наборов 1+1 по Ликомасту/Урсосану/Пробиологу/Бак-сету в Апреле сейчас нет — только клуб. Наборы 1+1 и «2 уп. −300 ₽» смотрите на Apteka.ru.',
    summaryTotal: 'от ~7 400 ₽ (Апрель-клуб Урсосан ~2 825 ₽)',
    summary: [
      {
        title: 'Ликомаст №30 × 2',
        price: 'от ~1 684 ₽',
        href: 'https://megapteka.ru/smolensk/catalog/akusherstvo-ginekologiya-43/likomast-kaps-n-43543',
      },
      {
        title: 'Бактистатин — Apteka.ru 1+1 №60',
        price: '1 846 ₽ / 120 капс.',
        href: 'https://apteka.ru/search/?q=%D0%91%D0%90%D0%9A%D0%A2%D0%98%D0%A1%D0%A2%D0%90%D0%A2%D0%98%D0%9D',
      },
      {
        title: 'Урсосан 180 капс. — Апрель клуб',
        price: 'от 2 825 ₽',
        href: 'https://009.xn--p1ai/smolensk/kupit-ursosan',
      },
      {
        title: 'Магний хелат Эвалар №120 (200 мг×2)',
        price: 'от ~1 879 ₽',
        href: 'https://smolensk.uteka.ru/bad/bad-istochnik-mineralnyh-veshhestv/magnij-helat/',
      },
    ],
    rows: [
      {
        name: 'Ликомаст',
        need: '60 капс. на 2 мес.',
        note: 'В аптеках только №30 — нужно 2 уп. В сети Апрель в Смоленске на 009.рф сейчас не найден. Мегаптека: от 841,8 ₽/уп.',
        options: [
          {
            title: 'Ликомаст №30 × 2',
            where: 'Мегаптека / АптекаПлюс',
            how: 'Сравнение аптек',
            price: 'от 1 684 ₽',
            detail: 'Мегаптека от 841,8 ₽ × 2',
            best: true,
            buyUrl:
              'https://megapteka.ru/smolensk/catalog/akusherstvo-ginekologiya-43/likomast-kaps-n-43543',
            buyLabel: 'Смотреть на Мегаптеке',
            extraLinks: [
              {
                href: 'https://009.xn--p1ai/smolensk/kupit-likomast',
                label: '009.рф',
              },
            ],
          },
          {
            title: 'Ликомаст №30 × 2',
            where: 'Apteka.ru',
            how: 'Бронь / самовывоз',
            price: 'от ~1 860 ₽',
            detail: 'от 930 ₽ × 2; набора 1+1 нет',
            buyUrl: 'https://apteka.ru/product/likomast-30-sht-kapsuly-5e326c5cf5a9ae000140a4ea/',
            buyLabel: 'Купить на Apteka.ru',
          },
          {
            title: 'Ликомаст — Апрель',
            where: 'Апрель Смоленск',
            how: '—',
            price: 'нет в выдаче',
            detail: 'на 009.рф по Смоленску предложений Апрель нет',
            buyUrl: 'https://apteka-april.ru/',
            buyLabel: 'Проверить на apteka-april.ru',
          },
        ],
      },
      {
        name: 'Пробиотик',
        need: '60 шт. (предпочтение: Бактистатин)',
        note: 'Бактистатин в Апреле не найден. На Apteka.ru есть акция «1+1» (наборы). Мегаптека — цены по аптекам Смоленска.',
        options: [
          {
            title: 'Набор 1+1 Бактистатин №60 (120 капс.)',
            where: 'Apteka.ru',
            how: 'Бронь / самовывоз',
            price: '1 846 ₽',
            detail: 'было 2 297,92 (−19%); ~923 ₽ за №60. На курс 60 — вторая уп. в запас',
            best: true,
            buyUrl:
              'https://apteka.ru/search/?q=%D0%91%D0%90%D0%9A%D0%A2%D0%98%D0%A1%D0%A2%D0%90%D0%A2%D0%98%D0%9D',
            buyLabel: 'Наборы на Apteka.ru',
            extraLinks: [
              {
                href: 'https://apteka.ru/product/baktistatin-60-sht-kapsuly-massoj-05-g-5e3263d7ca7bdc000192ac08/',
                label: 'Одна №60 ~1 103 ₽',
              },
            ],
          },
          {
            title: 'Бактистатин №60',
            where: 'Apteka.ru',
            how: 'Бронь / самовывоз',
            price: 'от 1 103 ₽',
            detail: 'одна уп. на курс 60; №20 от ~621 ₽',
            buyUrl:
              'https://apteka.ru/product/baktistatin-60-sht-kapsuly-massoj-05-g-5e3263d7ca7bdc000192ac08/',
            buyLabel: 'Купить на Apteka.ru',
            extraLinks: [
              {
                href: 'https://apteka.ru/product/baktistatin-20-sht-kapsuly-massoj-05-g-5e326ad2ca7bdc000192e117/',
                label: '№20 от 621',
              },
            ],
          },
          {
            title: 'Набор 1+1 Бактистатин №20 (40 капс.)',
            where: 'Apteka.ru',
            how: 'Бронь / самовывоз',
            price: '1 040 ₽',
            detail: 'было 1 240 (−16%); на курс 60 мало — нужна ещё уп.',
            buyUrl:
              'https://apteka.ru/search/?q=%D0%91%D0%90%D0%9A%D0%A2%D0%98%D0%A1%D0%A2%D0%90%D0%A2%D0%98%D0%9D',
            buyLabel: 'Наборы на Apteka.ru',
          },
          {
            title: 'Бактистатин №60',
            where: 'Мегаптека',
            how: 'Сравнение аптек',
            price: 'от 1 256 ₽',
            detail: 'Смоленск; на 009.рф от ~1 100 ₽',
            buyUrl:
              'https://megapteka.ru/smolensk/catalog/zabolevaniya-zhkt-52/baktistatin-kaps-0-5g-39331',
            buyLabel: 'Смотреть на Мегаптеке',
            extraLinks: [
              {
                href: 'https://009.xn--p1ai/smolensk/product/baktistatin_kapsuly_05_g_n60',
                label: '009.рф',
              },
              {
                href: 'https://zdravcity.ru/p_baktistatin-kaps-500mg-n60-0002973/r_smolensk/',
                label: 'Здравсити',
              },
            ],
          },
          {
            title: 'Пробиолог Форте №30 × 2',
            where: 'Апрель (клуб)',
            how: 'Самовывоз',
            price: '1 668 ₽',
            detail: 'клуб 834 ₽ × 2 (без клуба 1 205 ₽/уп.). Набора 1+1 в Апреле нет',
            buyUrl: 'https://009.xn--p1ai/smolensk/product/probiolog_forte_kapsuly_227_mg_n30',
            buyLabel: 'Апрель на 009.рф',
            extraLinks: [
              {
                href: 'https://megapteka.ru/smolensk/catalog/zabolevaniya-zhkt-52/probiolog-forte-kaps-57090',
                label: 'Мегаптека от 912',
              },
              {
                href: 'https://apteka.ru/product/probiolog-forte-30-sht-kapsuly-massoj-227-mg-6863921579115dedda30b0d9/',
                label: 'Apteka.ru от ~958',
              },
            ],
          },
          {
            title: 'Набор Бак-Сет Форте 2×№20 (−300 ₽)',
            where: 'Apteka.ru',
            how: 'Бронь / самовывоз',
            price: '1 374 ₽ / 40 капс.',
            detail: 'было 1 674 (−17%). На курс 60: набор + 1 уп. ≈ от ~2 200 ₽ — обычно дороже Ютеки/Мегаптеки',
            buyUrl:
              'https://apteka.ru/product/nabor-bak-set-forte-n20-kaps-iz-2-x-upakovok-so-skidkoj-300-rublej-68da49ad080ee09825e1b4d9/',
            buyLabel: 'Набор на Apteka.ru',
            extraLinks: [
              {
                href: 'https://apteka.ru/product/bak-set-forte-20-sht-kapsuly-massoj-210-mg-5e32722df5a9ae000140cec3/',
                label: 'Одна №20',
              },
              {
                href: 'https://apteka.ru/brand/bak-set/',
                label: 'Все наборы БАК-СЕТ',
              },
            ],
          },
          {
            title: 'Бак-Сет Форте №20 × 3',
            where: 'Мегаптека / Ютека',
            how: 'Сравнение аптек',
            price: 'от ~1 650–1 707 ₽',
            detail: 'Мегаптека от 569 × 3; Ютека ~550 × 3 — выгоднее набора на курс 60',
            buyUrl:
              'https://megapteka.ru/smolensk/catalog/zabolevaniya-zhkt-52/bak-set-forte-kaps-45712',
            buyLabel: 'Смотреть на Мегаптеке',
            extraLinks: [
              {
                href: 'https://smolensk.uteka.ru/product/bak-set-forte-314880/',
                label: 'Ютека',
              },
              {
                href: 'https://009.xn--p1ai/smolensk/product/bak-set_forte_kapsuly_n20',
                label: 'Апрель клуб 684×3',
              },
            ],
          },
          {
            title: 'Бак-Сет Форте №20 × 3',
            where: 'Апрель (клуб)',
            how: 'Самовывоз',
            price: '2 052 ₽',
            detail: 'клуб 684 ₽ × 3; отдельного набора 1+1 в Апреле нет',
            buyUrl: 'https://009.xn--p1ai/smolensk/product/bak-set_forte_kapsuly_n20',
            buyLabel: 'Апрель на 009.рф',
          },
          {
            title: 'Лактиале 60 шт.',
            where: 'Смоленск',
            how: '—',
            price: 'не найдено',
            detail: 'в РФ почти не представлен',
            buyUrl: null,
          },
        ],
      },
      {
        name: 'Урсосан / аналог',
        need: '250 мг, 180 капс.',
        note: 'Фасовки №180 нет. Рецептурный. Апрель клуб (сейчас): №100 1 516 ₽, №50 787 ₽, №10 174 ₽. Наборов 1+1 Урсосана на Apteka.ru / в Апреле не найдено.',
        options: [
          {
            title: 'Урсосан: №100 + №50 + 3×№10',
            where: 'Апрель (клуб)',
            how: 'Самовывоз',
            price: '2 825 ₽',
            detail: '1 516 + 787 + 3×174; без клуба ~1 802+931+3×191',
            best: true,
            buyUrl: 'https://009.xn--p1ai/smolensk/kupit-ursosan',
            buyLabel: 'Апрель на 009.рф',
            extraLinks: [
              {
                href: 'https://009.xn--p1ai/smolensk/product/ursosan_kapsuly_250_mg_n100',
                label: '№100 клуб 1516',
              },
              {
                href: 'https://009.xn--p1ai/smolensk/product/ursosan_kapsuly_250_mg_n50',
                label: '№50 клуб 787',
              },
              {
                href: 'https://009.xn--p1ai/smolensk/product/ursosan_kapsuly_250_mg_n10',
                label: '№10 клуб 174',
              },
            ],
          },
          {
            title: 'Урсосан: №100 + №50 + 3×№10',
            where: 'Мегаптека',
            how: 'Сравнение аптек',
            price: 'от ~2 922 ₽',
            detail: '1 567 + 815 + 3×180',
            buyUrl:
              'https://megapteka.ru/smolensk/catalog/zabolevaniya-pecheni-i-56/ursosan-kaps-250mg-34643',
            buyLabel: '№100 на Мегаптеке',
            extraLinks: [
              {
                href: 'https://megapteka.ru/smolensk/catalog/zabolevaniya-pecheni-i-56/ursosan-kaps-250mg-35545',
                label: '№50 от 815',
              },
              {
                href: 'https://megapteka.ru/smolensk/catalog/zabolevaniya-pecheni-i-56/ursosan-kaps-250mg-35546',
                label: '№10 от 180',
              },
            ],
          },
          {
            title: 'Урсосан: 2× №100',
            where: 'Апрель (клуб)',
            how: 'Самовывоз',
            price: '3 032 ₽',
            detail: '1 516 ₽ × 2 = 200 капс.',
            buyUrl: 'https://009.xn--p1ai/smolensk/product/ursosan_kapsuly_250_mg_n100',
            buyLabel: 'Апрель №100',
          },
          {
            title: 'Урсосан №50 / №100',
            where: 'Apteka.ru',
            how: 'Бронь / самовывоз',
            price: '№50 от ~868 ₽; №100 от ~1 676 ₽',
            detail: 'набора 1+1 нет; на ~180 капс. дороже Апрель-клуба',
            buyUrl: 'https://apteka.ru/product/ursosan-250-mg-50-sht-kapsuly-5e326592f5a9ae0001406c50/',
            buyLabel: '№50 на Apteka.ru',
            extraLinks: [
              {
                href: 'https://apteka.ru/product/ursosan-250-mg-100-sht-kapsuly-5e326d04f5a9ae000140a81d/',
                label: '№100',
              },
            ],
          },
          {
            title: 'Урсосан: №100 + №50 + 3×№10',
            where: 'Ютека',
            how: 'Самовывоз',
            price: 'от ~2 860 ₽',
            detail: '~1 565 + 810 + 3×161',
            buyUrl: 'https://smolensk.uteka.ru/lekarstvennye-sredstva/zheludochno-kishechnye-sredstva/ursosan/',
            buyLabel: 'Все фасовки на Ютеке',
          },
          {
            title: 'Урдокса 250 мг №100 × 2',
            where: 'Здравсити',
            how: 'Самовывоз',
            price: 'от ~3 200 ₽',
            detail: 'аналог УДХК',
            buyUrl: 'https://zdravcity.ru/p_urdoksa-kaps-250-mg-n100-0101250/r_smolensk/',
            buyLabel: 'Купить на Здравсити',
          },
        ],
      },
      {
        name: 'Магния хелат',
        need: '400–600 мг элементарного Mg/день, 2 мес.',
        note: 'Важно: у GLS «капс. 400 мг» — масса капсулы, не Mg (~50 мг элем./капс.). GLS Maximum ~100 мг/капс. Наборов 1+1 Эвалар/GLS на Apteka.ru не найдено — берите большую фасовку №120.',
        options: [
          {
            title: 'Эвалар №120 — 200 мг Mg/табл.',
            where: 'Ютека',
            how: 'Самовывоз / доставка',
            price: 'от 1 879 ₽',
            detail: '2 табл. = 400 мг; 1 уп. = 2 мес.',
            best: true,
            buyUrl: 'https://smolensk.uteka.ru/bad/bad-istochnik-mineralnyh-veshhestv/magnij-helat/',
            buyLabel: 'Купить на Ютеке',
            extraLinks: [
              {
                href: 'https://apteka.ru/product/magnij-xelat-120-sht-tabletki-massoj-14-g-614dc049595884028e65c4d4/',
                label: 'Apteka.ru №120 ~1 951',
              },
            ],
          },
          {
            title: 'GLS Maximum №120 × 2 — ~100 мг Mg/капс.',
            where: 'Мегаптека',
            how: 'Сравнение аптек',
            price: 'от 1 860 ₽',
            detail: '4 капс. = 400 мг; от 930 ₽ × 2 на 2 мес.',
            buyUrl:
              'https://megapteka.ru/smolensk/catalog/vitaminy-i-mikroelementy-49/magnij-helat-gls-4789514',
            buyLabel: 'Смотреть на Мегаптеке',
          },
          {
            title: 'Эвалар №60 × 2 — 200 мг Mg/табл.',
            where: 'Apteka.ru / Мегаптека',
            how: 'Бронь / сравнение',
            price: 'от ~2 528–2 590 ₽',
            detail: 'Apteka.ru №60 ~1 264 × 2; хуже одной №120',
            buyUrl: 'https://apteka.ru/product/magnij-xelat-60-sht-tabletki-massoj-14-g-5e327a2cf5a9ae000141106f/',
            buyLabel: '№60 на Apteka.ru',
            extraLinks: [
              {
                href: 'https://megapteka.ru/smolensk/catalog/vitaminy-i-mikroelementy-49/magnij-helat-tab-3115310',
                label: 'Мегаптека от 1 295',
              },
            ],
          },
          {
            title: 'Доппельгерц хелат+B6 №60 — 150 мг/капс.',
            where: 'Мегаптека',
            how: 'Сравнение аптек',
            price: 'от ~6 500 ₽',
            detail: 'от 2 166 ₽/уп.; 3 капс.=450 мг → ~3 уп. на 2 мес.',
            buyUrl:
              'https://megapteka.ru/smolensk/catalog/nevrologiya-62/doppelgerc-magniya-helat-4667234',
            buyLabel: 'Смотреть на Мегаптеке',
            extraLinks: [
              {
                href: 'https://uteka.ru/product/doppelgerts-magniya-khelatv6-420050/',
                label: 'Ютека',
              },
            ],
          },
          {
            title: 'GLS «400 мг» №180 — ~50 мг Mg/капс.!',
            where: '009.рф',
            how: 'Самовывоз',
            price: 'от 1 069 ₽ / уп.',
            detail: '8 капс./день на 400 мг → №180 ≈ 22 дня; на 2 мес. ~3 уп. (~3 200 ₽)',
            buyUrl: 'https://009.xn--p1ai/smolensk/kupit-gls_magniy_helat',
            buyLabel: 'Состав на 009.рф',
          },
        ],
      },
      {
        name: 'Бронхо-мунал',
        need: '7 мг, №30',
        note: 'Иммуномодулятор (бактериальный лизат). В РБ фасовка №30 на tabletka.by обычно не в выдаче — собирают 3×№10.',
        options: [
          {
            title: 'Бронхо-мунал 7 мг №30',
            where: '009.рф Смоленск',
            how: 'Самовывоз',
            price: 'от 1 748 ₽',
            detail: 'лучший ориентир по городу сейчас',
            best: true,
            buyUrl: 'https://009.xn--p1ai/smolensk/product/bronho-munal_kapsuly_7_mg_n30',
            buyLabel: 'Смотреть на 009.рф',
          },
          {
            title: 'Бронхо-мунал 7 мг №30',
            where: 'Мегаптека',
            how: 'Сравнение аптек',
            price: 'от 1 815 ₽',
            detail: 'Смоленск',
            buyUrl:
              'https://megapteka.ru/smolensk/catalog/immunomodulyatory-60/bronho-munal-kaps-7mg-33337',
            buyLabel: 'Смотреть на Мегаптеке',
            extraLinks: [
              {
                href: 'https://megapteka.ru/smolensk/catalog/immunomodulyatory-60/bronho-munal-kaps-7mg-33371',
                label: '№10 от 747',
              },
            ],
          },
        ],
      },
    ],
  },
  minsk: {
    id: 'minsk',
    label: 'Минск',
    currency: 'Br',
    summaryTotal: 'от ~413 Br',
    summary: [
      {
        title: 'Ликомаст №30 × 2',
        price: 'от ~68 Br',
        href: 'https://tabletka.by/result/?ls=104159',
      },
      {
        title: 'Бактистатин №60',
        price: 'от ~67 Br',
        href: 'https://tabletka.by/result/?ls=108629',
      },
      {
        title: 'Урсосан 250 мг №50 ×4 (~200 капс.)',
        price: 'от ~212 Br',
        href: 'https://tabletka.by/result/?ls=30749',
      },
      {
        title: 'GLS Maximum №120 ×2 (100 мг×4 = 400 мг)',
        price: 'от ~66 Br',
        href: 'https://tabletka.by/result/?ls=119811',
      },
    ],
    rows: [
      {
        name: 'Ликомаст',
        need: '60 капс. на 2 мес.',
        note: 'Фасовка №30 — нужно 2 уп. Цены в белорусских рублях (Br).',
        options: [
          {
            title: 'Ликомаст №30 × 2',
            where: 'tabletka.by',
            how: 'Сравнение аптек РБ',
            price: 'от 68,00 Br',
            detail: 'от 34,00 Br × 2 (до 62,31/уп.)',
            best: true,
            buyUrl: 'https://tabletka.by/result/?ls=104159',
            buyLabel: 'Смотреть на tabletka.by',
            extraLinks: [
              { href: 'https://apteka.103.by/likomast/minsk/', label: '103.by' },
            ],
          },
        ],
      },
      {
        name: 'Пробиотик',
        need: '60 шт. (предпочтение: Бактистатин)',
        note: 'Цены tabletka.by по аптекам Беларуси; бронирование — в выбранной аптеке.',
        options: [
          {
            title: 'Бактистатин №60',
            where: 'tabletka.by',
            how: 'Сравнение аптек',
            price: 'от 67,02 Br',
            detail: 'до ~72,9 Br в выборке',
            best: true,
            buyUrl: 'https://tabletka.by/result/?ls=108629',
            buyLabel: 'Смотреть на tabletka.by',
            extraLinks: [
              {
                href: 'https://apteka.103.by/baktistatin/51145-kapsuly-n60/kraft/minsk/',
                label: '103.by',
              },
            ],
          },
          {
            title: 'Пробиолог Форте №30 × 2',
            where: 'tabletka.by',
            how: 'Сравнение аптек',
            price: 'от 66,26 Br',
            detail: 'от 33,13 Br × 2',
            buyUrl: 'https://tabletka.by/result/?ls=107990',
            buyLabel: 'Смотреть на tabletka.by',
          },
          {
            title: 'Бак-Сет Форте №20 × 3',
            where: 'tabletka.by',
            how: 'Сравнение аптек',
            price: 'от 83,04 Br',
            detail: 'от 27,68 Br × 3',
            buyUrl: 'https://tabletka.by/result/?ls=105672',
            buyLabel: 'Смотреть на tabletka.by',
          },
          {
            title: 'Лактиале 60 шт.',
            where: 'Минск',
            how: '—',
            price: 'не найдено',
            detail: 'на tabletka.by / 103.by не найден',
            buyUrl: null,
          },
        ],
      },
      {
        name: 'Урсосан / аналог',
        need: '250 мг, 180 капс.',
        note: 'На tabletka.by Урсосан 250 мг обычно №50. На ~180 капс.: 4×№50. Есть Урсаклин/Урсокапс.',
        options: [
          {
            title: 'Урсосан 250 мг №50 × 4',
            where: 'tabletka.by',
            how: 'Сравнение аптек',
            price: 'от 212,00 Br',
            detail: 'от 53,00 Br × 4 (~200 капс.)',
            best: true,
            buyUrl: 'https://tabletka.by/result/?ls=30749',
            buyLabel: 'Смотреть на tabletka.by',
            extraLinks: [
              { href: 'https://apteka.103.by/ursosan/minsk/', label: '103.by' },
            ],
          },
          {
            title: 'Урсаклин 250 мг №60 × 3',
            where: 'tabletka.by (Академфарм)',
            how: 'Сравнение аптек',
            price: 'от 71,28 Br',
            detail: 'от 23,76 Br × 3 = 180 капс.',
            buyUrl: 'https://tabletka.by/result/?ls=18217',
            buyLabel: 'Смотреть на tabletka.by',
          },
          {
            title: 'Урсокапс 250 мг №50 × 4',
            where: 'tabletka.by',
            how: 'Сравнение аптек',
            price: 'от 90,28 Br',
            detail: 'от 22,57 Br × 4',
            buyUrl: 'https://tabletka.by/result/?ls=15374',
            buyLabel: 'Смотреть на tabletka.by',
          },
        ],
      },
      {
        name: 'Магния хелат',
        need: '400–600 мг элементарного Mg/день, 2 мес.',
        note: 'GLS Maximum: 400 мг Mg в 4 капс. (≈100 мг/капс.). Эвалар: 200 мг/табл.',
        options: [
          {
            title: 'GLS Maximum №120 × 2 — ~100 мг/капс.',
            where: 'tabletka.by',
            how: 'Сравнение аптек',
            price: 'от 66,38 Br',
            detail: 'от 33,19 Br × 2; 4 капс. = 400 мг',
            best: true,
            buyUrl: 'https://tabletka.by/result/?ls=119811',
            buyLabel: 'Смотреть на tabletka.by',
            extraLinks: [
              {
                href: 'https://apteka.103.by/magniy-khelat-maximum-gls/minsk/',
                label: '103.by',
              },
            ],
          },
          {
            title: 'Эвалар №120 — 200 мг/табл.',
            where: 'tabletka.by',
            how: 'Сравнение аптек',
            price: 'от 104,82 Br',
            detail: '2 табл. = 400 мг; 1 уп. = 2 мес.',
            buyUrl: 'https://tabletka.by/result/?ls=112742',
            buyLabel: 'Смотреть на tabletka.by',
          },
          {
            title: 'Доппельгерц хелат+B6 №60 — 150 мг/капс.',
            where: 'tabletka.by',
            how: 'Сравнение аптек',
            price: 'от 70,20 Br / уп.',
            detail: '3 капс.=450 мг → ~3 уп. на 2 мес. (~210 Br)',
            buyUrl: 'https://tabletka.by/result/?ls=117764',
            buyLabel: 'Смотреть на tabletka.by',
          },
        ],
      },
      {
        name: 'Бронхо-мунал',
        need: '7 мг, №30',
        note: 'На tabletka.by для 7 мг обычно только №10. На курс №30: 3×№10.',
        options: [
          {
            title: 'Бронхо-мунал 7 мг №10 × 3',
            where: 'tabletka.by',
            how: 'Сравнение аптек',
            price: 'от 74,19 Br',
            detail: 'от 24,73 Br × 3 (фасовки №30 в выдаче нет)',
            best: true,
            buyUrl: 'https://tabletka.by/result/?ls=1974',
            buyLabel: 'Смотреть на tabletka.by',
          },
          {
            title: 'Бронхо-мунал П 3,5 мг №10',
            where: 'tabletka.by',
            how: 'Сравнение аптек',
            price: 'от 17,14 Br / уп.',
            detail: 'детская/меньшая доза — не замена 7 мг без врача',
            buyUrl: 'https://tabletka.by/result/?ls=1975',
            buyLabel: 'Смотреть на tabletka.by',
          },
        ],
      },
    ],
  },
}

function buyCell(o) {
  if (!o.buyUrl) {
    return '<span class="muted">нет ссылки</span>'
  }
  const extras = (o.extraLinks || [])
    .map((l) => `<a class="buy-extra" href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`)
    .join(' ')
  return `<a class="buy" href="${o.buyUrl}" target="_blank" rel="noopener">${o.buyLabel}</a>${extras ? `<div class="buy-extras">${extras}</div>` : ''}`
}

function compareSection(fx) {
  const perRub = fx.rate / fx.scale
  let ruSum = 0
  let bySum = 0
  const body = compareRows
    .map((row) => {
      const ruByn = row.ruRub != null ? rubToByn(row.ruRub, fx) : null
      if (ruByn != null && row.byn != null) {
        // только основные позиции набора в итог — отметим later
      }
      const cheaper =
        ruByn == null
          ? row.byn != null
            ? 'by-only'
            : 'eq'
          : row.byn == null
            ? 'ru-only'
            : ruByn < row.byn
              ? 'ru'
              : row.byn < ruByn
                ? 'by'
                : 'eq'
      const delta =
        ruByn != null && row.byn != null ? Math.abs(ruByn - row.byn) : null
      return `
        <tr class="${cheaper === 'ru' ? 'cheap-ru' : cheaper === 'by' ? 'cheap-by' : ''}">
          <td data-label="Препарат">${row.name}</td>
          <td data-label="Россия (₽)">${
            row.ruRub != null
              ? `<a href="${row.ruUrl}" target="_blank" rel="noopener">${fmtRub(row.ruRub)}</a><div class="sub">${row.ruNote}</div>`
              : '<span class="muted">—</span>'
          }</td>
          <td data-label="Россия в Br">${ruByn != null ? fmtByn(ruByn) : '—'}</td>
          <td data-label="Беларусь (Br)">${
            row.byn != null
              ? `<a href="${row.byUrl}" target="_blank" rel="noopener">${fmtByn(row.byn)}</a><div class="sub">${row.byNote}</div>`
              : '—'
          }</td>
          <td data-label="Где дешевле">${
            cheaper === 'ru'
              ? `РФ дешевле на ${fmtByn(delta)}`
              : cheaper === 'by'
                ? `РБ дешевле на ${fmtByn(delta)}`
                : cheaper === 'by-only'
                  ? 'только РБ'
                  : cheaper === 'ru-only'
                    ? 'только РФ'
                    : '≈'
          }</td>
        </tr>`
    })
    .join('')

  // Recommended basket totals
  const basket = [
    compareRows[0], // likomast
    compareRows[1], // baktistatin
    compareRows[4], // ursosan
    compareRows[6], // magnesium
  ]
  const ruTotalRub = basket.reduce((s, r) => s + (r.ruRub || 0), 0)
  const ruTotalByn = rubToByn(ruTotalRub, fx)
  const byTotal = basket.reduce((s, r) => s + (r.byn || 0), 0)

  return `
    <section class="summary compare-box">
      <h2>Сравнение Россия / Беларусь (в Br)</h2>
      <p class="note">Курс НБРБ: <strong>${fx.scale} ₽ = ${fx.rate} Br</strong> (${fx.date}), т.е. 1 ₽ ≈ ${perRub.toFixed(5)} Br. <a href="https://www.nbrb.by/statistics/rates/ratesdaily.asp" target="_blank" rel="noopener">nbrb.by</a></p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Препарат / курс</th>
              <th>Смоленск, ₽</th>
              <th>Смоленск → Br</th>
              <th>Минск, Br</th>
              <th>Выгоднее</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <p class="total">Набор (Ликомаст + Бактистатин + Урсосан + Mg на 400 мг элем./день): Россия <strong>${fmtRub(ruTotalRub)}</strong> ≈ <strong>${fmtByn(ruTotalByn)}</strong>; Беларусь <strong>${fmtByn(byTotal)}</strong> — ${
        ruTotalByn < byTotal
          ? `в РФ дешевле на ${fmtByn(byTotal - ruTotalByn)}`
          : `в РБ дешевле на ${fmtByn(ruTotalByn - byTotal)}`
      }.</p>
    </section>
  `
}

function render(cityId, fx) {
  const city = cities[cityId]
  const app = document.querySelector('#app')
  const isCompare = cityId === 'compare'

  app.innerHTML = `
    <div class="page">
      <header class="header">
        <p class="eyebrow">Самовывоз и доставка в аптеку · цены на ${updated}${
          pricesMeta.status === 'live' ? ' · автообновление' : ''
        }</p>
        <h1>Подбор лекарств и цен</h1>
        <div class="city-switch" role="tablist" aria-label="Город">
          ${Object.values(cities)
            .map(
              (c) => `
            <button type="button" class="city-btn${c.id === cityId ? ' active' : ''}" data-city="${c.id}" role="tab" aria-selected="${c.id === cityId}">
              ${c.label}
            </button>
          `,
            )
            .join('')}
          <button type="button" class="city-btn${isCompare ? ' active' : ''}" data-city="compare" role="tab" aria-selected="${isCompare}">Сравнение</button>
        </div>
        <p class="lead">${
          isCompare
            ? 'Минимальные цены курса в Смоленске и Минске, всё в белорусских рублях по курсу НБРБ.'
            : `Сейчас: <strong>${city.label}</strong>. Перед покупкой сверьте наличие. Для Урсосана/аналогов — по назначению врача.${
                city.clubNote ? ` <span class="club-note">${city.clubNote}</span>` : ''
              }`
        }</p>
      </header>

      ${
        isCompare
          ? compareSection(fx)
          : `
      <section class="summary">
        <h2>Рекомендуемый набор — ${city.label}</h2>
        <ul>
          ${city.summary
            .map(
              (item) => `
            <li><a href="${item.href}" target="_blank" rel="noopener">${item.title}</a> — <strong>${item.price}</strong></li>
          `,
            )
            .join('')}
        </ul>
        <p class="total">Итого ориентир: <strong>${city.summaryTotal}</strong></p>
      </section>

      ${city.rows
        .map(
          (group) => `
        <section class="group">
          <div class="group-head">
            <h2>${group.name}</h2>
            <p class="need">${group.need}</p>
            <p class="note">${group.note}</p>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Вариант</th>
                  <th>Где</th>
                  <th>Как</th>
                  <th>Цена курса</th>
                  <th>Комментарий</th>
                  <th>Ссылка</th>
                </tr>
              </thead>
              <tbody>
                ${group.options
                  .map(
                    (o) => `
                  <tr class="${o.best ? 'best' : ''}">
                    <td data-label="Вариант">${o.best ? '<span class="tag">лучше</span> ' : ''}${o.title}</td>
                    <td data-label="Где">${o.where}</td>
                    <td data-label="Как">${o.how}</td>
                    <td data-label="Цена" class="price">${o.price}</td>
                    <td data-label="Комментарий">${o.detail}</td>
                    <td data-label="Ссылка">${buyCell(o)}</td>
                  </tr>
                `,
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </section>
      `,
        )
        .join('')}
      `
      }

      <footer class="footer">
        <p>${
          isCompare
              ? 'Курс: НБРБ API (живой). РБ: tabletka.by; РФ: Мегаптека/009.рф. Файл prices.json обновляется скриптом.'
              : cityId === 'minsk'
              ? 'Источники: tabletka.by, 103.by — Беларусь/Минск. Цены подтягиваются из prices.json.'
              : 'Источники: Мегаптека, 009.рф (Апрель клуб), Apteka.ru. Живые «от» — Мегаптека/tabletka/Апрель.'
        } Не оферта; цены меняются.</p>
      </footer>
    </div>
  `

  app.querySelectorAll('[data-city]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-city')
      localStorage.setItem('pharmacy-city', next)
      render(next, fx)
    })
  })
}

const initial = localStorage.getItem('pharmacy-city') || 'compare'
const bootFx = { ...NBRB_RUB_FALLBACK }
render(initial, bootFx)

Promise.all([loadPrices(), loadNbrbRate()]).then(([prices, fx]) => {
  if (prices?.fx?.rate) {
    // prefer embedded fx from prices.json if fresher fetch failed differently — still use live NBRB
  }
  render(localStorage.getItem('pharmacy-city') || initial, fx)
})
