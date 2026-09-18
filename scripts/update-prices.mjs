#!/usr/bin/env node
/**
 * Fetch live pharmacy prices into public/data/prices.json
 * Sources: Мегаптека (Смоленск), tabletka.by, 009.рф (Апрель клуб), НБРБ.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../public/data/prices.json')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function get(url, { headers = {}, timeoutMs = 20000 } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, 'Accept-Language': 'ru', ...headers },
      redirect: 'follow',
    })
    if (!res.ok) throw new Error(`${res.status} ${url}`)
    return await res.text()
  } finally {
    clearTimeout(t)
  }
}

function num(s) {
  if (s == null) return null
  const n = Number(String(s).replace(/\s|\u00a0|\u202f/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function fmtRub(n) {
  return n == null ? null : Math.round(n)
}

async function nbrb() {
  try {
    const raw = await get('https://www.nbrb.by/api/exrates/rates/456', { timeoutMs: 8000 })
    const data = JSON.parse(raw)
    return {
      scale: data.Cur_Scale,
      rate: data.Cur_OfficialRate,
      date: String(data.Date).slice(0, 10),
      source: 'nbrb.by',
    }
  } catch (e) {
    console.warn('NBRB fail', e.message)
    return { scale: 100, rate: 3.6095, date: '2026-09-15', source: 'fallback' }
  }
}

async function megaptekaFrom(url) {
  // set city cookie via homepage first
  await get('https://megapteka.ru/smolensk', { timeoutMs: 15000 }).catch(() => '')
  const html = await get(url)
  const title = (html.match(/<title>([^<]+)/) || [])[1] || ''
  const m = title.match(/от\s*([\d\s.,]+)\s*₽/)
  const fromTitle = m ? num(m[1]) : null
  // fallback: first non-zero offer price in page
  const offers = [...html.matchAll(/"price"\s*:\s*([\d.]+)/g)]
    .map((x) => num(x[1]))
    .filter((x) => x && x > 50)
  return {
    pack: fromTitle || offers[0] || null,
    source: 'megapteka.ru',
    url,
    title: title.slice(0, 120),
  }
}

async function tabletkaFrom(ls, url) {
  const html = await get(url || `https://tabletka.by/result/?ls=${ls}`)
  // schema.org AggregateOffer
  let low = null
  const lowM = html.match(/"lowPrice"\s*:\s*"?([\d.]+)"?/)
  if (lowM) low = num(lowM[1])
  if (low == null) {
    const m = html.match(/AggregateOffer[\s\S]{0,200}?lowPrice["\s:]+([\d.]+)/i)
    if (m) low = num(m[1])
  }
  return { pack: low, source: 'tabletka.by', url: url || `https://tabletka.by/result/?ls=${ls}`, ls }
}

async function aprilClub(url) {
  const html = await get(url)
  // first product__price is usually club price on 009
  const prices = [...html.matchAll(/product__price[^>]*>[\s\S]*?([\d\u00a0\s]+)\s*₽/g)]
    .map((m) => num(m[1]))
    .filter((x) => x && x > 50)
  return { pack: prices[0] || null, regular: prices[1] || null, source: '009.рф/Апрель', url }
}

function mul(pack, qty) {
  if (pack == null) return null
  return Math.round(pack * qty * 100) / 100
}

async function main() {
  console.log('Updating prices…')
  const fx = await nbrb()

  const jobs = {
    likomastRu: megaptekaFrom(
      'https://megapteka.ru/smolensk/catalog/akusherstvo-ginekologiya-43/likomast-kaps-n-43543',
    ),
    baktistatinRu: megaptekaFrom(
      'https://megapteka.ru/smolensk/catalog/zabolevaniya-zhkt-52/baktistatin-kaps-0-5g-39331',
    ),
    probiologRu: megaptekaFrom(
      'https://megapteka.ru/smolensk/catalog/zabolevaniya-zhkt-52/probiolog-forte-kaps-57090',
    ),
    baksetRu: megaptekaFrom(
      'https://megapteka.ru/smolensk/catalog/zabolevaniya-zhkt-52/bak-set-forte-kaps-45712',
    ),
    ursosan100Ru: megaptekaFrom(
      'https://megapteka.ru/smolensk/catalog/zabolevaniya-pecheni-i-56/ursosan-kaps-250mg-34643',
    ),
    ursosan50Ru: megaptekaFrom(
      'https://megapteka.ru/smolensk/catalog/zabolevaniya-pecheni-i-56/ursosan-kaps-250mg-35545',
    ),
    ursosan10Ru: megaptekaFrom(
      'https://megapteka.ru/smolensk/catalog/zabolevaniya-pecheni-i-56/ursosan-kaps-250mg-35546',
    ),
    glsMaxRu: megaptekaFrom(
      'https://megapteka.ru/smolensk/catalog/vitaminy-i-mikroelementy-49/magnij-helat-gls-4789514',
    ),
    evalar60Ru: megaptekaFrom(
      'https://megapteka.ru/smolensk/catalog/vitaminy-i-mikroelementy-49/magnij-helat-tab-3115310',
    ),
    likomastBy: tabletkaFrom(104159),
    baktistatinBy: tabletkaFrom(108629),
    probiologBy: tabletkaFrom(107990),
    baksetBy: tabletkaFrom(105672),
    ursosan50By: tabletkaFrom(30749),
    ursaklinBy: tabletkaFrom(18217),
    glsMaxBy: tabletkaFrom(119811),
    bronhomunal30Ru: megaptekaFrom(
      'https://megapteka.ru/smolensk/catalog/immunomodulyatory-60/bronho-munal-kaps-7mg-33337',
    ),
    bronhomunal10Ru: megaptekaFrom(
      'https://megapteka.ru/smolensk/catalog/immunomodulyatory-60/bronho-munal-kaps-7mg-33371',
    ),
    bronhomunal10By: tabletkaFrom(1974),
    aprilBronho30: aprilClub(
      'https://009.xn--p1ai/smolensk/product/bronho-munal_kapsuly_7_mg_n30',
    ),
    aprilUrs100: aprilClub(
      'https://009.xn--p1ai/smolensk/product/ursosan_kapsuly_250_mg_n100',
    ),
    aprilUrs50: aprilClub(
      'https://009.xn--p1ai/smolensk/product/ursosan_kapsuly_250_mg_n50',
    ),
    aprilUrs10: aprilClub(
      'https://009.xn--p1ai/smolensk/product/ursosan_kapsuly_250_mg_n10',
    ),
    aprilProbio: aprilClub(
      'https://009.xn--p1ai/smolensk/product/probiolog_forte_kapsuly_227_mg_n30',
    ),
    aprilBakset: aprilClub(
      'https://009.xn--p1ai/smolensk/product/bak-set_forte_kapsuly_n20',
    ),
  }

  const keys = Object.keys(jobs)
  const values = await Promise.all(
    keys.map(async (k) => {
      try {
        return await jobs[k]
      } catch (e) {
        console.warn(k, e.message)
        return { pack: null, error: e.message, source: 'error' }
      }
    }),
  )
  const r = Object.fromEntries(keys.map((k, i) => [k, values[i]]))

  const aprilUrsosan =
    r.aprilUrs100.pack != null && r.aprilUrs50.pack != null && r.aprilUrs10.pack != null
      ? fmtRub(r.aprilUrs100.pack + r.aprilUrs50.pack + 3 * r.aprilUrs10.pack)
      : null

  const megaUrsosan =
    r.ursosan100Ru.pack != null && r.ursosan50Ru.pack != null && r.ursosan10Ru.pack != null
      ? fmtRub(r.ursosan100Ru.pack + r.ursosan50Ru.pack + 3 * r.ursosan10Ru.pack)
      : null

  const data = {
    updatedAt: new Date().toISOString(),
    fx,
    sources: {
      ru: 'megapteka.ru (Смоленск), 009.рф Апрель клуб',
      by: 'tabletka.by',
      note: 'Apteka.ru наборы — вручную (антибот). Цены «от».',
    },
    raw: r,
    compare: [
      {
        id: 'likomast',
        name: 'Ликомаст 60 капс. (2×№30)',
        ruRub: fmtRub(mul(r.likomastRu.pack, 2)),
        ruNote: r.likomastRu.pack
          ? `Мегаптека от ${r.likomastRu.pack}×2`
          : 'Мегаптека',
        byn: mul(r.likomastBy.pack, 2),
        byNote: r.likomastBy.pack
          ? `tabletka.by от ${String(r.likomastBy.pack).replace('.', ',')}×2`
          : 'tabletka.by',
        ruUrl: r.likomastRu.url,
        byUrl: r.likomastBy.url,
      },
      {
        id: 'baktistatin',
        name: 'Бактистатин №60',
        ruRub: fmtRub(r.baktistatinRu.pack),
        ruNote: r.baktistatinRu.pack
          ? `Мегаптека Смоленск от ${r.baktistatinRu.pack}`
          : 'Мегаптека',
        byn: r.baktistatinBy.pack,
        byNote: r.baktistatinBy.pack
          ? `tabletka.by от ${String(r.baktistatinBy.pack).replace('.', ',')}`
          : 'tabletka.by',
        ruUrl: r.baktistatinRu.url,
        byUrl: r.baktistatinBy.url,
      },
      {
        id: 'probiolog',
        name: 'Пробиолог Форте 60 (2×№30)',
        ruRub: fmtRub(mul(r.aprilProbio.pack ?? r.probiologRu.pack, 2)),
        ruNote: r.aprilProbio.pack
          ? `Апрель клуб ${r.aprilProbio.pack}×2`
          : r.probiologRu.pack
            ? `Мегаптека от ${r.probiologRu.pack}×2`
            : '—',
        byn: mul(r.probiologBy.pack, 2),
        byNote: r.probiologBy.pack
          ? `tabletka.by от ${String(r.probiologBy.pack).replace('.', ',')}×2`
          : 'tabletka.by',
        ruUrl: r.aprilProbio.url || r.probiologRu.url,
        byUrl: r.probiologBy.url,
      },
      {
        id: 'bakset',
        name: 'Бак-Сет Форте 60 (3×№20)',
        ruRub: fmtRub(mul(r.baksetRu.pack, 3)),
        ruNote: r.baksetRu.pack
          ? `Мегаптека от ${r.baksetRu.pack}×3`
          : 'Мегаптека',
        byn: mul(r.baksetBy.pack, 3),
        byNote: r.baksetBy.pack
          ? `tabletka.by от ${String(r.baksetBy.pack).replace('.', ',')}×3`
          : 'tabletka.by',
        ruUrl: r.baksetRu.url,
        byUrl: r.baksetBy.url,
      },
      {
        id: 'ursosan',
        name: 'Урсосан ~180 капс. 250 мг',
        ruRub: aprilUrsosan ?? megaUrsosan,
        ruNote: aprilUrsosan
          ? `Апрель клуб: ${r.aprilUrs100.pack}+${r.aprilUrs50.pack}+3×${r.aprilUrs10.pack}`
          : megaUrsosan
            ? 'Мегаптека 100+50+3×10'
            : '—',
        byn: mul(r.ursosan50By.pack, 4),
        byNote: r.ursosan50By.pack
          ? `tabletka.by 4×№50 от ${String(r.ursosan50By.pack).replace('.', ',')}`
          : 'tabletka.by',
        ruUrl: 'https://009.xn--p1ai/smolensk/kupit-ursosan',
        byUrl: r.ursosan50By.url,
      },
      {
        id: 'ursaklin',
        name: 'Урсосан аналог (дешёвый УДХК)',
        ruRub: null,
        ruNote: '—',
        byn: mul(r.ursaklinBy.pack, 3),
        byNote: r.ursaklinBy.pack
          ? `Урсаклин №60×3, tabletka.by от ${String(r.ursaklinBy.pack).replace('.', ',')}`
          : 'tabletka.by',
        ruUrl: null,
        byUrl: r.ursaklinBy.url,
      },
      {
        id: 'magnesium',
        name: 'Магний хелат (~400 мг элем./день, 2 мес.)',
        ruRub: fmtRub(mul(r.glsMaxRu.pack, 2)),
        ruNote: r.glsMaxRu.pack
          ? `Мегаптека GLS Max №120×2 от ${r.glsMaxRu.pack}`
          : 'GLS Max',
        byn: mul(r.glsMaxBy.pack, 2),
        byNote: r.glsMaxBy.pack
          ? `GLS Max №120×2, tabletka.by от ${String(r.glsMaxBy.pack).replace('.', ',')}`
          : 'tabletka.by',
        ruUrl: r.glsMaxRu.url,
        byUrl: r.glsMaxBy.url,
      },
      {
        id: 'bronhomunal',
        name: 'Бронхо-мунал 7 мг №30',
        ruRub: fmtRub(r.aprilBronho30.pack ?? r.bronhomunal30Ru.pack),
        ruNote: r.aprilBronho30.pack
          ? `009.рф/Апрель от ${r.aprilBronho30.pack}`
          : r.bronhomunal30Ru.pack
            ? `Мегаптека от ${r.bronhomunal30Ru.pack}`
            : '—',
        byn: mul(r.bronhomunal10By.pack, 3),
        byNote: r.bronhomunal10By.pack
          ? `tabletka.by 3×№10 от ${String(r.bronhomunal10By.pack).replace('.', ',')} (№30 нет)`
          : 'tabletka.by',
        ruUrl:
          r.aprilBronho30.url ||
          r.bronhomunal30Ru.url ||
          'https://009.xn--p1ai/smolensk/product/bronho-munal_kapsuly_7_mg_n30',
        byUrl: r.bronhomunal10By.url,
      },
    ],
    highlights: {
      likomastRuPack: r.likomastRu.pack,
      baktistatinRu: r.baktistatinRu.pack,
      aprilUrsosan,
      megaUrsosan,
      glsMaxRuPack: r.glsMaxRu.pack,
      evalar60Ru: r.evalar60Ru.pack,
      aprilProbio: r.aprilProbio.pack,
      aprilBakset: r.aprilBakset.pack,
      likomastBy: r.likomastBy.pack,
      baktistatinBy: r.baktistatinBy.pack,
      ursosan50By: r.ursosan50By.pack,
      glsMaxBy: r.glsMaxBy.pack,
      bronhomunal30Ru: r.aprilBronho30.pack ?? r.bronhomunal30Ru.pack,
      bronhomunal10By: r.bronhomunal10By.pack,
    },
  }

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n')
  console.log('Wrote', outPath)
  console.log('updatedAt', data.updatedAt)
  console.log(
    'sample',
    data.compare.map((c) => `${c.id}: RU=${c.ruRub} BY=${c.byn}`).join(' | '),
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
