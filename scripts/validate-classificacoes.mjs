import { readFileSync } from 'node:fs';

const PATH = './data/classificacoes.json';
let data;
try {
  data = JSON.parse(readFileSync(PATH, 'utf8'));
} catch (e) {
  console.error(`❌ Não foi possível ler ${PATH}: ${e.message}`);
  process.exit(1);
}

const erros = [];
const seen = new Map();

data.forEach((item, i) => {
  const rotulo = `[${i}] "${item.item?.slice(0, 50) || '(sem item)'}"`;

  const pn = (item.pn || '').trim().toUpperCase();
  if (!pn) { erros.push(`${rotulo} → PN ausente.`); return; }

  if (seen.has(pn)) {
    erros.push(`${rotulo} → PN duplicado "${pn}". Já em [${seen.get(pn)}].`);
  } else {
    seen.set(pn, i);
  }

  if (!/^\d{8}$/.test(String(item.ncm || ''))) {
    erros.push(`${rotulo} → NCM inválido: "${item.ncm}".`);
  }

  if (!item.item || !item.item.trim()) {
    erros.push(`${rotulo} → Campo "item" vazio.`);
  }
});

if (erros.length) {
  console.error('\n❌ Validação FALHOU:\n');
  erros.forEach(e => console.error('  • ' + e));
  console.error(`\n${erros.length} erro(s). Corrija antes de commitar.\n`);
  process.exit(1);
}

console.log(`✅ ${data.length} itens validados. Tudo OK.`);