import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const CSV_IN = process.argv[2] || './Classificação_Fiscal.csv';
const JSON_OUT = './data/classificacoes.json';

if (!existsSync(CSV_IN)) {
  console.error(`❌ CSV não encontrado: ${CSV_IN}`);
  process.exit(1);
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') { field += c; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const raw = readFileSync(CSV_IN, 'utf8').replace(/^\uFEFF/, '');
const rows = parseCSV(raw);
const header = rows.shift().map(h => h.trim());

const keyMap = {
  'Item': 'item', 'Classe': 'classe', 'PN': 'pn',
  'NCM': 'ncm', 'EX': 'ex', 'Descrição DUIMP': 'descricao_duimp',
  'Responsáveis pela Análise': 'responsaveis', 'Análise': 'analise',
  'Histórico de Reclassificação': 'historico_reclassificacao'
};

const items = rows.filter(r => r.some(f => f && f.trim())).map(r => {
  const obj = {};
  header.forEach((h, i) => {
    const key = keyMap[h] || h;
    const val = (r[i] ?? '').trim();

      obj[key] = val;
    
  });
  obj.pn = (obj.pn || '').trim();
  obj.ncm = (obj.ncm || '').replace(/\D/g, '');
  return obj;
});

const porPN = new Map();
items.forEach((it, i) => {
  const k = it.pn.toUpperCase();
  if (!porPN.has(k)) porPN.set(k, []);
  porPN.get(k).push({ i, item: it.item, ncm: it.ncm });
});

const duplicados = [...porPN.entries()].filter(([, v]) => v.length > 1);
if (duplicados.length) {
  console.warn('\n PNs duplicados encontrados:\n');
  duplicados.forEach(([pn, v]) => {
    console.warn(`  • ${pn}`);
    v.forEach(x => console.warn(`      [${x.i}] ${x.item}`));
  });
  console.warn('\n Corrija no CSV mantendo 1 linha por PN e rode de novo.\n');
} else {
  console.log('✅ Nenhuma duplicata de PN.');
}

writeFileSync(JSON_OUT, JSON.stringify(items, null, 2), 'utf8');
console.log(`\n📁 Gerado: ${JSON_OUT} (${items.length} itens)`);