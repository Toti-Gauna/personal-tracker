#!/usr/bin/env node
/**
 * Plan v12.1 (21 Nov 2026) → data/plan-extendido.json (stages, phases, blocks with explicit dates, certs, math milestones, papers,
 * habits, reminders) and data/proyectos-v7.json (versions with dates, deadlines and PetrIA's batches). Reads the archived roadmap v7
 * (data/archivo/roadmap-v7/) to keep each project's card, technologies and history and each window's books. Idempotent.
 *
 * Usage: node scripts/plan-v12.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (p) => JSON.parse(readFileSync(join(RAIZ, p), 'utf8'));
const V7 = leer('data/archivo/roadmap-v7/plan-extendido.json');
const PV7 = leer('data/archivo/roadmap-v7/proyectos-v7.json');
const HOY = '2026-11-21';
const viejo = (id) => V7.bloques.find((b) => b.id === id);

// ——— stages and phases ———
const ETAPAS = [
  { n: 1, nombre: 'Núcleo', perfil: 'Senior ML + DevSecOps + Cloud', inicio: '2026-11-21', fin: '2027-09-19' },
  { n: 2, nombre: 'Ciberseguridad', perfil: 'Security Engineer', inicio: '2027-09-20', fin: '2027-11-21' },
  { n: 3, nombre: 'Quant', perfil: 'Quant Trading Engineer', inicio: '2027-11-22', fin: '2028-04-15' },
  { n: 4, nombre: 'Aeroespacial', perfil: 'GNC / Mission Software Engineer', inicio: '2028-04-16', fin: '2028-10-27' },
];
const FASES = [
  { id: 'F1', etapa: 1, nombre: 'AI Full-stack Engineer', inicio: '2026-11-21', fin: '2027-01-14',
    salida: ['PetrIA in production (4 versions)', 'VitalIA in production (4 versions)', '4 certs passed', 'English Made Simple finished', '30–50 applications'],
    mercado: ['PetrIA', 'Claude Architect', 'GitHub Foundations', 'VitalIA', 'AI-103', 'Databricks'], roles: ['AI Full-stack', 'AI Engineer', 'Applied AI'] },
  { id: 'F2', etapa: 1, nombre: 'ML Engineer', inicio: '2027-01-15', fin: '2027-03-17',
    salida: ['Base math done (W1 milestones)', 'AWS MLA passed', 'AWS SAA passed', 'AgrIA in production', 'Cambridge C1 taken'],
    mercado: ['AgrIA', 'AWS MLA', 'GitHub Actions', 'AWS SAA', 'AWS Network Lab', 'Prometheus', 'Cambridge C1'], mercadoAConfirmar: true },
  { id: 'F3', etapa: 1, nombre: 'Systems / Realtime', inicio: '2027-03-18', fin: '2027-04-17',
    salida: ['Antena live', 'Constelación 2.1 live', 'AWS Developer passed', 'Terraform passed', '15+ applications'],
    mercado: ['Antena', 'Constelación 2.1', 'AWS Developer', 'Terraform'] },
  { id: 'F4', etapa: 1, nombre: 'DevSecOps / Platform', inicio: '2027-04-18', fin: '2027-05-29',
    salida: ['All 16 initial certs passed'],
    mercado: ['PetrIA Guard', 'Security+', 'GitHub Advanced Security', 'CKA', 'OpenTelemetry', 'AWS GenAI Pro', 'Claude Developer'], mercadoAConfirmar: true },
  { id: 'F5', etapa: 1, nombre: 'Computer Vision / MLOps', inicio: '2027-05-30', fin: '2027-07-18',
    salida: ['W2 milestones done', 'AeroScan live', 'Multiplatform week live', 'AgrIA Sat live', '4 papers with thesis', '10+ applications'],
    mercado: ['AeroScan', 'AgrIA Sat'] },
  { id: 'F6', etapa: 1, nombre: 'AI Security + Edge + SRE', inicio: '2027-07-19', fin: '2027-09-19',
    salida: ['W3 milestones done (incl. mini-GPT)', 'AdversarIA live', 'AeroScan Edge live', 'Antena Ops live', '4 papers with thesis', '10+ applications'],
    mercado: ['AdversarIA', 'AeroScan Edge', 'Antena Ops'], mercadoAConfirmar: true },
  { id: 'F7', etapa: 2, nombre: 'Security Engineer', inicio: '2027-09-20', fin: '2027-11-21',
    salida: ['W4 milestones done', 'Bóveda live', 'Asedio live', 'Vigía live', 'PNPT passed'],
    mercado: ['Bóveda', 'Asedio', 'Vigía', 'PNPT'], mercadoAConfirmar: true },
  { id: 'F8', etapa: 3, nombre: 'Quant Developer', inicio: '2027-11-22', fin: '2028-02-19',
    salida: ['WQ1 milestones done', 'WQ2 milestones done', 'Alpha Lab live', 'Paper Trail live', 'Volta live', 'Matchbook live', 'CKS passed'],
    mercado: ['Alpha Lab', 'Paper Trail', 'Volta', 'Matchbook', 'CKS'], mercadoAConfirmar: true },
  { id: 'F9', etapa: 3, nombre: 'Quant Trading Engineer', inicio: '2028-02-20', fin: '2028-04-15',
    salida: ['WQ3 milestones done', 'Comando live', 'Ticker live', 'AWS Security Specialty passed'],
    mercado: ['Comando', 'Ticker', 'AWS Security Specialty'], mercadoAConfirmar: true },
  { id: 'F10', etapa: 4, nombre: 'Simulation / CAE', inicio: '2028-04-16', fin: '2028-07-13',
    salida: ['WA1 milestones done', 'WA2 milestones done', 'WA3 milestones done', 'Trayecta live', 'Malla live', 'Viento live'],
    mercado: ['Trayecta', 'Malla', 'Viento'], mercadoAConfirmar: true },
  { id: 'F11', etapa: 4, nombre: 'GNC / Mission Software', inicio: '2028-07-14', fin: '2028-10-27',
    salida: ['WA4 milestones done', 'WA5 milestones done', 'Piloto live', 'Órbita live', 'Upstream live', 'Horizonte live', 'AWS SA Pro passed'],
    mercado: ['Piloto', 'Órbita', 'Upstream', 'Horizonte', 'AWS SA Pro'], mercadoAConfirmar: true },
];

// ——— helpers ———
const v = (id, inicio, fin, extra = {}) => ({ id, inicio, fin, ...extra });
const hito = (dias, inicio, fin, tema, meta, extra = {}) => ({ dias, inicio, fin, tema, hito: meta, ...extra });
const cert = (id, nombre, horas, recursos, plan, examen, extra = {}) => ({ id, nombre, horas, recursos, plan: plan.map(([fecha, texto]) => ({ fecha, texto })), examen, ...extra });
const VALIDEZ = { 'gh-foundations': 3, 'ai-103': 1, 'databricks-genai': 2, 'aws-mla': 3, 'gh-actions': 3, 'aws-saa': 3, prometheus: 2, 'aws-dva': 3, terraform: 2, secplus: 3, ghas: 3, cka: 2, otel: 2, 'aws-genai-pro': 3, cks: 2, 'aws-scs': 3, 'aws-sap': 3 };
/** The v7 cert block that described each cert (cost, versions), to keep its data. */
const CERT_V7 = { 'claude-architect': 'C8', 'aws-saa': 'C1', secplus: 'C2', 'aws-mla': 'C3', 'aws-genai-pro': 'C9', 'ai-103': 'C10', pnpt: 'C4', cka: 'C5', cks: 'C6', 'aws-scs': 'C7', 'gh-actions': 'C11', 'aws-sap': 'C12', ghas: 'C13' };

// ——— blocks (v12.1 order) ———
const B = [];
const add = (b) => B.push(b);

// Before phase 1: P0 v1 (agents, in progress) and the archived PetrIA v0 (old method, 19–20 Nov).
add({ id: 'P0', fase: null, tipo: 'proyecto', nombre: 'Constelación v1', inicio: '2026-11-16', fin: '2026-11-18', horas: 0, nota: 'La arman los agentes (en curso); tus metas de P0 siguen como las cargaste', sinAtraso: true });
add({ id: 'P1V0', fase: null, tipo: 'proyecto', nombre: 'PetrIA v0 (archived)', inicio: '2026-11-19', fin: '2026-11-20', horas: 0, archivado: true, nota: 'Horas del método viejo (19 y 20 nov): quedan acá y no cuentan para la PetrIA de v12.1', sinAtraso: true });

// PHASE 1
add({ id: 'P1', fase: 'F1', tipo: 'proyecto', nombre: 'PetrIA', inicio: '2026-11-21', fin: '2026-12-09', horas: 194.5, horasLim: 245, rol: 'Full-stack AI Engineer (energy)', entrevista: 'very high',
  versiones: [v('1.0', '2026-11-21', '2026-11-25', { deadline: '2026-12-01' }), v('1.1', '2026-11-26', '2026-11-30', { deadline: '2026-12-12' }), v('2.0', '2026-12-01', '2026-12-04', { deadline: '2026-12-22' }), v('3.0', '2026-12-05', '2026-12-09', { deadline: '2027-01-05' })],
  papers: [{ id: 'word2vec', nombre: 'word2vec (2013)', opcional: true }, { id: 'rag', nombre: 'Retrieval-Augmented Generation (2020)', opcional: true }] });
add({ id: 'CW1', fase: 'F1', tipo: 'cert', nombre: 'Cert window 1', inicio: '2026-12-10', fin: '2026-12-13', horas: 42, certs: [
  cert('claude-architect', 'Claude Certified Architect – Foundations', 30, ['Official exam guide', 'Anthropic courses', 'PetrIA learning.md'], [['2026-12-10', 'Guide + domains'], ['2026-12-11', 'Weak spots + mock'], ['2026-12-12', 'Mock 2 (AM) + exam']], '2026-12-12', { listo: 85, fallback: 'Exam in the week of 8 Jan 2027', reserva: '2026-11-21' }),
  cert('gh-foundations', 'GitHub Foundations', 12, ['MS Learn path', 'Practice assessment'], [['2026-12-12', 'Path (PM)'], ['2026-12-13', 'Mock + exam']], '2026-12-13', { listo: 85, fallback: 'Exam in the week of 8 Jan 2027', reserva: '2026-11-21' }),
] });
add({ id: 'E1', fase: 'F1', tipo: 'ingles', nombre: 'English E#1', inicio: '2026-12-14', fin: '2026-12-20', horas: 72,
  ingles: { libros: ['English Made Simple'], objetivo: 'English Made Simple: chapter 1 → half', reparto: { lv: { ingles: 5.5, entrevistas: 1.5, recall: 0.5, busqueda: 2.5 }, finde: { ingles: 8, busqueda: 3 } } },
  mercado: ['PetrIA', 'Claude Architect', 'GitHub Foundations'], roles: ['AI Full-stack', 'AI Engineer', 'Applied AI'] });
add({ id: 'P2', fase: 'F1', tipo: 'proyecto', nombre: 'VitalIA', inicio: '2026-12-21', fin: '2026-12-30', horas: 100, horasLim: 125, rol: 'AI Engineer, health (.NET, Azure)', entrevista: 'very high',
  versiones: [v('1.0', '2026-12-21', '2026-12-22'), v('1.1', '2026-12-23', '2026-12-25'), v('2.0', '2026-12-26', '2026-12-28'), v('3.0', '2026-12-29', '2026-12-30')] });
add({ id: 'CW2', fase: 'F1', tipo: 'cert', nombre: 'Cert window 2', inicio: '2026-12-31', fin: '2027-01-07', horas: 82, certs: [
  cert('ai-103', 'Azure AI-103 (AI App and Agent Developer Associate)', 45, ['MS Learn AI-103 path', 'Practice assessment', 'Azure sandbox'], [['2026-12-31', 'Path'], ['2027-01-01', 'Path'], ['2027-01-02', 'Path'], ['2027-01-03', 'Labs'], ['2027-01-04', '2 practice assessments'], ['2027-01-05', 'Exam']], '2027-01-05', { listo: 85, reserva: '2026-12-20' }),
  cert('databricks-genai', 'Databricks Generative AI Engineer Associate', 35, ['Exam guide (re-check 2 weeks before)', 'Databricks Academy', '2–3 mocks'], [['2027-01-06', 'Guide + course'], ['2027-01-07', 'Mocks + exam']], '2027-01-07', { listo: 85, opcional: true, fallback: 'If mocks < 85%, move to the end of Phase 3', reserva: '2026-12-20' }),
] });
add({ id: 'E2', fase: 'F1', tipo: 'ingles', nombre: 'English E#2', inicio: '2027-01-08', fin: '2027-01-14', horas: 72,
  ingles: { libros: ['English Made Simple', 'English Pronunciation Course'], objetivo: 'English Made Simple to the end (+ start Pronunciation)', reparto: { lv: { ingles: 5.5, entrevistas: 1.5, recall: 0.5, busqueda: 2.5 }, finde: { ingles: 8, busqueda: 3 } }, tareas: ['Book Cambridge C1 Advanced'] },
  mercado: ['PetrIA', 'Claude Architect', 'GitHub Foundations', 'VitalIA', 'AI-103', 'Databricks'] });

// PHASE 2
const CONAMAT = 'Conamat "Matemáticas simplificadas"';
add({ id: 'W1', fase: 'F2', tipo: 'ventana', nombre: 'Math W1', inicio: '2027-01-15', fin: '2027-02-03', horas: 206, libros: [CONAMAT], hitos: [
  hito([1, 4], '2027-01-15', '2027-01-18', 'Arithmetic', '50 mixed exercises, no errors', { capitulos: { actividad: 'conamat', desde: 1, hasta: 11 } }),
  hito([5, 10], '2027-01-19', '2027-01-24', 'Algebra (equations, systems, functions, exp & log)', '3×3 system and graphs by hand', { capitulos: { actividad: 'conamat-algebra', desde: 1, hasta: 17 } }),
  hito([11, 13], '2027-01-25', '2027-01-27', 'Trigonometry + base analytic geometry', 'Line equation, sin/cos without calculator', { capitulosAConfirmar: true }),
  hito([14, 20], '2027-01-28', '2027-02-03', 'Probability & statistics', 'Regression by hand, explain a confidence interval', { capitulosAConfirmar: true }),
] });
add({ id: 'CW3', fase: 'F2', tipo: 'cert', nombre: 'Cert window 3', inicio: '2027-02-04', fin: '2027-02-11', horas: 82, certs: [
  cert('aws-mla', 'AWS ML Engineer Associate (MLA-C02)', 65, ['Skill Builder exam prep', 'Udemy MLA course', 'Tutorials Dojo'], [['2027-02-04', 'Course'], ['2027-02-05', 'Course'], ['2027-02-06', 'Course'], ['2027-02-07', 'SageMaker labs'], ['2027-02-08', 'Mocks'], ['2027-02-09', 'Mocks (3 in total)'], ['2027-02-10', 'Exam']], '2027-02-10', { listo: 80 }),
  cert('gh-actions', 'GitHub Actions', 15, ['MS Learn', 'My PetrIA workflows'], [['2027-02-10', 'Path (PM)'], ['2027-02-11', 'Mock + exam']], '2027-02-11', { listo: 85 }),
] });
add({ id: 'E3', fase: 'F2', tipo: 'ingles', nombre: 'English E#3', inicio: '2027-02-12', fin: '2027-02-18', horas: 72,
  ingles: { libros: ['English Pronunciation Course', 'Cambridge C1 Advanced (official practice book)'], objetivo: '12–15 Feb Pronunciation Course to the end · 16–18 Feb Cambridge C1 intensive', reparto: { lv: { ingles: 7.5, busqueda: 2.5 }, finde: { ingles: 7.5, busqueda: 2.5 } } } });
add({ id: 'P3', fase: 'F2', tipo: 'proyecto', nombre: 'AgrIA', inicio: '2027-02-19', fin: '2027-03-02', horas: 115, horasLim: 130, rol: 'Applied ML Engineer (agro)', entrevista: 'high',
  versiones: [v('1.0', '2027-02-19', '2027-02-21'), v('1.1', '2027-02-22', '2027-02-24'), v('2.0', '2027-02-25', '2027-02-27'), v('3.0', '2027-02-28', '2027-03-02')] });
add({ id: 'CW4', fase: 'F2', tipo: 'cert', nombre: 'Cert window 4', inicio: '2027-03-03', fin: '2027-03-10', horas: 82, certs: [
  cert('aws-saa', 'AWS Solutions Architect Associate (SAA-C03)', 65, ['Cantrill or Maarek', 'Tutorials Dojo'], [['2027-03-03', 'Course'], ['2027-03-04', 'Course'], ['2027-03-05', 'Course'], ['2027-03-06', 'AWS Network Lab (mini-project)'], ['2027-03-07', 'Mocks'], ['2027-03-08', 'Mocks (3 in total)'], ['2027-03-09', 'Exam']], '2027-03-09', { listo: 80,
    miniProyecto: { nombre: 'AWS Network Lab', fecha: '2027-03-06', texto: 'Terraform VPC, 2 public + 2 private subnets in 2 AZs, internet gateway, NAT (create, test and destroy the same day: it costs money), security group vs NACL with one deliberately blocked connection test, VPC gateway endpoint to S3 + bucket policy restricted to that endpoint', entregables: ['Repo', 'README with diagram', 'Post'] } }),
  cert('prometheus', 'Prometheus Certified Associate', 15, ['Prometheus docs', 'KodeKloud PCA'], [['2027-03-09', 'PromQL and alerts (PM)'], ['2027-03-10', 'Mock + exam']], '2027-03-10', { listo: 85 }),
] });
add({ id: 'E4', fase: 'F2', tipo: 'ingles', nombre: 'English E#4', inicio: '2027-03-11', fin: '2027-03-17', horas: 72,
  ingles: { libros: ['Cambridge C1 Advanced (official practice book)'], objetivo: '4 full C1 mocks + recorded speaking + Cambridge C1 Advanced exam', reparto: { lv: { ingles: 7, busqueda: 3 }, finde: { ingles: 7, busqueda: 3 } }, examen: { nombre: 'Cambridge C1 Advanced', semana: ['2027-03-11', '2027-03-17'], nota: 'If the exam date is later, take it then without moving the plan', reserva: '2027-01-14' } } });

// PHASE 3
add({ id: 'P4', fase: 'F3', tipo: 'proyecto', nombre: 'Antena', inicio: '2027-03-18', fin: '2027-04-02', horas: 160, horasLim: 185, rol: 'Systems / Ground Software Engineer', entrevista: 'high',
  versiones: [v('1.0', '2027-03-18', '2027-03-21'), v('1.1', '2027-03-22', '2027-03-25'), v('2.0', '2027-03-26', '2027-03-29'), v('3.0', '2027-03-30', '2027-04-02')] });
add({ id: 'CW5', fase: 'F3', tipo: 'cert', nombre: 'Cert window 5', inicio: '2027-04-03', fin: '2027-04-08', horas: 62, certs: [
  cert('aws-dva', 'AWS Developer Associate (DVA-C03)', 40, ['Udemy course (skip the SAA overlap)', 'Tutorials Dojo'], [['2027-04-03', 'Course'], ['2027-04-04', 'Course'], ['2027-04-05', 'Two mocks'], ['2027-04-06', 'Exam']], '2027-04-06', { listo: 80 }),
  cert('terraform', 'Terraform Associate (004)', 22, ['HashiCorp tutorials', 'Course with mocks'], [['2027-04-06', 'Practice on Antena and Network Lab Terraform (PM)'], ['2027-04-07', 'Practice'], ['2027-04-08', 'Mock + exam']], '2027-04-08', { listo: 85 }),
] });
add({ id: 'J5', fase: 'F3', tipo: 'busqueda', nombre: 'Job search E#5', inicio: '2027-04-09', fin: '2027-04-12', horas: 42, busqueda: { reparto: { ingles: 3, busqueda: 7 } } });
add({ id: 'P0B', fase: 'F3', tipo: 'proyecto', nombre: 'Constelación 2.0 + 2.1', inicio: '2027-04-13', fin: '2027-04-17', horas: 50, horasLim: 60, notas: ['CDN = AWS CloudFront'],
  versiones: [v('2.0', '2027-04-13', '2027-04-14'), v('2.1', '2027-04-15', '2027-04-17')] });

// PHASE 4
add({ id: 'P5', fase: 'F4', tipo: 'proyecto', nombre: 'PetrIA Guard', inicio: '2027-04-18', fin: '2027-04-30', horas: 130, horasLim: 150, rol: 'DevSecOps / OT Security', entrevista: 'very high', notas: ['3.0 adds explicit Kubernetes Ingress load balancing + a "kill a pod" test'],
  versiones: [v('1.0', '2027-04-18', '2027-04-20'), v('1.1', '2027-04-21', '2027-04-23'), v('2.0', '2027-04-24', '2027-04-27'), v('3.0', '2027-04-28', '2027-04-30')] });
add({ id: 'CW6', fase: 'F4', tipo: 'cert', nombre: 'Cert window 6', inicio: '2027-05-01', fin: '2027-05-09', horas: 94, certs: [
  cert('secplus', 'CompTIA Security+ (current version at booking)', 75, ['Professor Messer', 'Jason Dion mocks'], [['2027-05-01', 'Videos + notes'], ['2027-05-02', 'Videos + notes'], ['2027-05-03', 'Videos + notes'], ['2027-05-04', 'Videos + notes'], ['2027-05-05', 'Performance-based questions'], ['2027-05-06', 'Mocks'], ['2027-05-07', 'Mocks (3 in total)'], ['2027-05-08', 'Exam']], '2027-05-08', { listo: 85 }),
  cert('ghas', 'GitHub Advanced Security', 18, ['MS Learn', 'CodeQL and secret scanning on my repos'], [['2027-05-08', 'Path (PM)'], ['2027-05-09', 'Mock + exam']], '2027-05-09', { listo: 85 }),
] });
add({ id: 'CW7', fase: 'F4', tipo: 'cert', nombre: 'Cert window 7', inicio: '2027-05-10', fin: '2027-05-17', horas: 82, certs: [
  cert('cka', 'CKA', 65, ['KodeKloud CKA', 'killer.sh'], [['2027-05-10', 'Course + labs'], ['2027-05-11', 'Course + labs'], ['2027-05-12', 'Course + labs'], ['2027-05-13', 'Troubleshooting'], ['2027-05-14', 'killer.sh #1'], ['2027-05-15', 'Review + killer.sh #2'], ['2027-05-16', 'Exam']], '2027-05-16', { listo: 85 }),
  cert('otel', 'OpenTelemetry Certified Associate', 17, ['OTel docs', 'LF intro course'], [['2027-05-16', 'Docs (PM)'], ['2027-05-17', 'Mock + exam']], '2027-05-17', { listo: 85 }),
] });
add({ id: 'CW8', fase: 'F4', tipo: 'cert', nombre: 'Cert window 8', inicio: '2027-05-18', fin: '2027-05-25', horas: 82, certs: [
  cert('aws-genai-pro', 'AWS Certified Generative AI Developer – Professional', 62, ['Skill Builder prep', 'Bedrock docs', 'Mocks'], [['2027-05-18', 'Prep'], ['2027-05-19', 'Prep'], ['2027-05-20', 'Prep'], ['2027-05-21', 'Bedrock labs'], ['2027-05-22', 'Mocks'], ['2027-05-23', 'Mocks'], ['2027-05-24', 'Exam']], '2027-05-24', { listo: 80 }),
  cert('claude-dev', 'Claude Certified Developer – Foundations', 20, ['Official guide'], [['2027-05-24', 'Guide (PM)'], ['2027-05-25', 'Mock + exam']], '2027-05-25', { listo: 85 }),
] });
add({ id: 'J6', fase: 'F4', tipo: 'busqueda', nombre: 'Job search E#6', inicio: '2027-05-26', fin: '2027-05-29', horas: 41, busqueda: { reparto: { ingles: 3, busqueda: 7 } } });

// PHASE 5
add({ id: 'W2', fase: 'F5', tipo: 'ventana', nombre: 'Math W2', inicio: '2027-05-30', fin: '2027-06-18', horas: 205, libros: [CONAMAT, 'Mathematics for Machine Learning (Deisenroth)'], hitos: [
  hito([1, 5], '2027-05-30', '2027-06-03', 'Conamat Differential calculus', 'Differentiate compositions, optimize by hand', { capitulosAConfirmar: true }),
  hito([6, 9], '2027-06-04', '2027-06-07', 'Conamat Integral calculus', 'Areas, integral as accumulation', { capitulosAConfirmar: true }),
  hito([10, 13], '2027-06-08', '2027-06-11', 'MML ch. 2 (linear algebra)', 'Invert matrices by hand'),
  hito([14, 17], '2027-06-12', '2027-06-15', 'MML ch. 4 + ch. 10 (SVD, PCA)', 'PCA by hand on 5 points'),
  hito([18, 20], '2027-06-16', '2027-06-18', 'MML ch. 5 + ch. 7 (backprop, optimization)', 'Backprop by hand for a 2-layer net'),
], papers: [{ id: 'backprop', nombre: 'Learning representations by back-propagating errors (1986)' }, { id: 'adam', nombre: 'Adam (2014)' }] });
add({ id: 'P6', fase: 'F5', tipo: 'proyecto', nombre: 'AeroScan', inicio: '2027-06-19', fin: '2027-07-02', horas: 135, horasLim: 155, rol: 'ML Engineer (CV)', entrevista: 'high',
  versiones: [v('1.0', '2027-06-19', '2027-06-22'), v('1.1', '2027-06-23', '2027-06-25'), v('2.0', '2027-06-26', '2027-06-28'), v('3.0', '2027-06-29', '2027-07-02')],
  papers: [{ id: 'alexnet', nombre: 'AlexNet (2012)' }, { id: 'resnet', nombre: 'ResNet (2015)' }] });
add({ id: 'SUM', fase: 'F5', tipo: 'sumas', nombre: 'Multiplatform week', inicio: '2027-07-03', fin: '2027-07-05', horas: 25 });
add({ id: 'P7', fase: 'F5', tipo: 'proyecto', nombre: 'AgrIA Sat', inicio: '2027-07-06', fin: '2027-07-15', horas: 100, horasLim: 115, rol: 'ML / MLOps Engineer', entrevista: 'very high',
  versiones: [v('1.0', '2027-07-06', '2027-07-07'), v('1.1', '2027-07-08', '2027-07-10'), v('2.0', '2027-07-11', '2027-07-13'), v('3.0', '2027-07-14', '2027-07-15')] });
add({ id: 'JP5', fase: 'F5', tipo: 'busqueda', nombre: 'Job search (short)', inicio: '2027-07-16', fin: '2027-07-18', horas: 32, busqueda: { reparto: { ingles: 3, busqueda: 7 } } });

// PHASE 6
add({ id: 'W3', fase: 'F6', tipo: 'ventana', nombre: 'Math W3', inicio: '2027-07-19', fin: '2027-08-01', horas: 144, libros: ['Blitzstein & Hwang, Introduction to Probability', 'Mathematics for Machine Learning', 'MacKay, Information Theory, Inference, and Learning Algorithms', 'Strang, Introduction to Linear Algebra', 'Karpathy, Let\'s build GPT'], hitos: [
  hito([1, 5], '2027-07-19', '2027-07-23', 'Blitzstein & Hwang ch. 1–7', 'Bayes, joint distributions'),
  hito([6, 7], '2027-07-24', '2027-07-25', 'MML ch. 6', 'Multivariate Gaussian'),
  hito([8, 10], '2027-07-26', '2027-07-28', 'MacKay ch. 2', 'Entropy, KL and cross-entropy by hand'),
  hito([11, 12], '2027-07-29', '2027-07-30', 'Strang: SVD + low rank', 'Why LoRA works'),
  hito([13, 14], '2027-07-31', '2027-08-01', 'Transformers from the inside: mini-GPT by hand (Karpathy, "Let\'s build GPT")', 'Train it on a small text and explain attention with my own diagram'),
] });
add({ id: 'P8', fase: 'F6', tipo: 'proyecto', nombre: 'AdversarIA', inicio: '2027-08-02', fin: '2027-08-10', horas: 85, horasLim: 105, rol: 'AI Security Engineer', entrevista: 'very high',
  versiones: [v('1.0', '2027-08-02', '2027-08-03'), v('1.1', '2027-08-04', '2027-08-05'), v('2.0', '2027-08-06', '2027-08-08'), v('3.0', '2027-08-09', '2027-08-10')],
  papers: [{ id: 'attention', nombre: 'Attention Is All You Need (2017)' }, { id: 'lora', nombre: 'LoRA (2021)' }] });
add({ id: 'P9', fase: 'F6', tipo: 'proyecto', nombre: 'AeroScan Edge', inicio: '2027-08-11', fin: '2027-08-23', horas: 125, horasLim: 145, rol: 'Edge AI Engineer', entrevista: 'high', notas: ['Sync service on DynamoDB (conditional writes for conflicts)'],
  versiones: [v('1.0', '2027-08-11', '2027-08-13'), v('1.1', '2027-08-14', '2027-08-16'), v('2.0', '2027-08-17', '2027-08-20'), v('3.0', '2027-08-21', '2027-08-23')],
  papers: [{ id: 'distillation', nombre: 'Distilling the Knowledge in a Neural Network (2015)' }] });
add({ id: 'P10', fase: 'F6', tipo: 'proyecto', nombre: 'Antena Ops', inicio: '2027-08-24', fin: '2027-09-06', horas: 135, horasLim: 170, rol: 'Senior ML + DevSecOps + Cloud', entrevista: 'very high',
  versiones: [v('1.0', '2027-08-24', '2027-08-27'), v('1.1', '2027-08-28', '2027-08-30'), v('2.0', '2027-08-31', '2027-09-02'), v('3.0', '2027-09-03', '2027-09-06')],
  papers: [{ id: 'lstm', nombre: 'Long Short-Term Memory (1997)' }] });
add({ id: 'JP6', fase: 'F6', tipo: 'busqueda', nombre: 'Job search (short)', inicio: '2027-09-07', fin: '2027-09-09', horas: 31, busqueda: { reparto: { ingles: 3, busqueda: 7 } } });
add({ id: 'COL', fase: 'F6', tipo: 'colchon', nombre: 'Consolidation', inicio: '2027-09-10', fin: '2027-09-19' });

// STAGE 2 · PHASE 7
add({ id: 'W4', fase: 'F7', tipo: 'ventana', nombre: 'Math W4', inicio: '2027-09-20', fin: '2027-09-24', horas: 50, libros: ['Silverman, A Friendly Introduction to Number Theory', 'Aumasson, Serious Cryptography'], hitos: [
  hito([1, 3], '2027-09-20', '2027-09-22', 'Silverman: divisibility, gcd, congruences, Fermat, Euler, RSA', 'Toy RSA by hand'),
  hito([4, 5], '2027-09-23', '2027-09-24', 'Aumasson: randomness, block ciphers, AEAD, hashing, key exchange', 'Explain AES-GCM and nonce reuse'),
] });
add({ id: 'S1', fase: 'F7', tipo: 'proyecto', nombre: 'Bóveda', inicio: '2027-09-25', fin: '2027-10-03', horas: 85, horasLim: 100, versiones: [v('1.0', '2027-09-25', '2027-09-26'), v('1.1', '2027-09-27', '2027-09-28'), v('2.0', '2027-09-29', '2027-10-01'), v('3.0', '2027-10-02', '2027-10-03')] });
add({ id: 'S2', fase: 'F7', tipo: 'proyecto', nombre: 'Asedio', inicio: '2027-10-04', fin: '2027-10-14', horas: 105, horasLim: 130, versiones: [v('1.0', '2027-10-04', '2027-10-06'), v('1.1', '2027-10-07', '2027-10-09'), v('2.0', '2027-10-10', '2027-10-11'), v('3.0', '2027-10-12', '2027-10-14')] });
add({ id: 'S3', fase: 'F7', tipo: 'proyecto', nombre: 'Vigía', inicio: '2027-10-15', fin: '2027-10-27', horas: 125, horasLim: 155, versiones: [v('1.0', '2027-10-15', '2027-10-17'), v('1.1', '2027-10-18', '2027-10-20'), v('2.0', '2027-10-21', '2027-10-24'), v('3.0', '2027-10-25', '2027-10-27')] });
add({ id: 'CW9', fase: 'F7', tipo: 'cert', nombre: 'PNPT', inicio: '2027-10-28', fin: '2027-11-11', horas: 154, certs: [
  cert('pnpt', 'PNPT', 154, ['TCM courses (PEH, OSINT, External Pentest Playbook, Windows/Linux PrivEsc)', 'PEH AD lab'], [['2027-10-28', 'AD/OSINT intensive + lab (through 3 Nov, lab twice)'], ['2027-11-04', 'Practical exam (through 8 Nov)'], ['2027-11-09', 'Report'], ['2027-11-10', 'Report'], ['2027-11-11', 'Debrief in English']], '2027-11-11', { listo: 'AD lab end-to-end without guide' }),
] });
add({ id: 'J7', fase: 'F7', tipo: 'busqueda', nombre: 'Job search E#7', inicio: '2027-11-12', fin: '2027-11-15', horas: 42, busqueda: { reparto: { ingles: 3, busqueda: 7 } } });
add({ id: 'CIE2', fase: 'F7', tipo: 'cierre', nombre: 'Stage close', inicio: '2027-11-16', fin: '2027-11-21' });

// STAGE 3 · PHASE 8
add({ id: 'WQ1', fase: 'F8', tipo: 'ventana', nombre: 'Math WQ1', inicio: '2027-11-22', fin: '2027-11-29', horas: 82, libros: ['Blitzstein (Markov chains)', 'Hyndman, Forecasting: Principles and Practice', 'López de Prado, Advances in Financial ML'], hitos: [
  hito([1, 2], '2027-11-22', '2027-11-23', 'Blitzstein: Markov chains, random walks', '(to confirm)', { hitoAConfirmar: true }),
  hito([3, 6], '2027-11-24', '2027-11-27', 'Hyndman: decomposition, autocorrelation, ARIMA, time-series CV', '(to confirm)', { hitoAConfirmar: true }),
  hito([7, 8], '2027-11-28', '2027-11-29', 'López de Prado: backtest overfitting, deflated Sharpe', '(to confirm)', { hitoAConfirmar: true }),
] });
add({ id: 'Q1', fase: 'F8', tipo: 'proyecto', nombre: 'Alpha Lab', inicio: '2027-11-30', fin: '2027-12-12', horas: 125, horasLim: 145, versiones: [v('1.0', '2027-11-30', '2027-12-02'), v('1.1', '2027-12-03', '2027-12-05'), v('2.0', '2027-12-06', '2027-12-09'), v('3.0', '2027-12-10', '2027-12-12')] });
add({ id: 'Q2', fase: 'F8', tipo: 'proyecto', nombre: 'Paper Trail', inicio: '2027-12-13', fin: '2027-12-30', horas: 105, horasLim: 130, versiones: [v('1.0', '2027-12-13', '2027-12-15'), v('1.1', '2027-12-16', '2027-12-18'), v('2.0', '2027-12-19', '2027-12-27', { nota: '19 Dec + 27 Dec (pause in between)' }), v('3.0', '2027-12-28', '2027-12-30')] });
add({ id: 'DES3', fase: 'F8', tipo: 'descanso', nombre: 'Rest', inicio: '2027-12-31', fin: '2028-01-06' });
add({ id: 'WQ2', fase: 'F8', tipo: 'ventana', nombre: 'Math WQ2', inicio: '2028-01-07', fin: '2028-01-16', horas: 104, libros: ['Shreve, Stochastic Calculus for Finance I', 'Shreve, Stochastic Calculus for Finance II (ch. 3–5)', 'Hull, Options, Futures, and Other Derivatives'], hitos: [
  hito([1, 3], '2028-01-07', '2028-01-09', 'Shreve I (binomial)', '(to confirm)', { hitoAConfirmar: true }),
  hito([4, 7], '2028-01-10', '2028-01-13', 'Shreve II ch. 3–5 (Brownian motion, Itô, Black-Scholes)', '(to confirm)', { hitoAConfirmar: true }),
  hito([8, 10], '2028-01-14', '2028-01-16', 'Hull (BS, Greeks, implied vol, Monte Carlo)', '(to confirm)', { hitoAConfirmar: true }),
] });
add({ id: 'Q3', fase: 'F8', tipo: 'proyecto', nombre: 'Volta', inicio: '2028-01-17', fin: '2028-01-29', horas: 130, horasLim: 150, versiones: [v('1.0', '2028-01-17', '2028-01-19'), v('1.1', '2028-01-20', '2028-01-22'), v('2.0', '2028-01-23', '2028-01-26'), v('3.0', '2028-01-27', '2028-01-29')] });
add({ id: 'Q4', fase: 'F8', tipo: 'proyecto', nombre: 'Matchbook', inicio: '2028-01-30', fin: '2028-02-09', horas: 105, horasLim: 120, versiones: [v('1.0', '2028-01-30', '2028-02-01'), v('1.1', '2028-02-02', '2028-02-04'), v('2.0', '2028-02-05', '2028-02-06'), v('3.0', '2028-02-07', '2028-02-09')] });
add({ id: 'CW10', fase: 'F8', tipo: 'cert', nombre: 'CKS', inicio: '2028-02-10', fin: '2028-02-15', horas: 62, certs: [
  cert('cks', 'CKS', 62, ['KodeKloud CKS', 'killer.sh'], [['2028-02-10', 'Course + labs'], ['2028-02-11', 'Course + labs'], ['2028-02-12', 'Course + labs'], ['2028-02-13', 'killer.sh #1'], ['2028-02-14', 'Review + killer.sh #2'], ['2028-02-15', 'Exam']], '2028-02-15', { listo: 85, requiere: 'cka' }),
] });
add({ id: 'J8', fase: 'F8', tipo: 'busqueda', nombre: 'Job search E#8', inicio: '2028-02-16', fin: '2028-02-19', horas: 41, busqueda: { reparto: { ingles: 3, busqueda: 7 } } });
// PHASE 9
add({ id: 'WQ3', fase: 'F9', tipo: 'ventana', nombre: 'Math WQ3', inicio: '2028-02-20', fin: '2028-02-24', horas: 51, libros: ['Boyd & Vandenberghe, Convex Optimization', 'Cornuéjols & Tütüncü, Optimization Methods in Finance'], hitos: [
  hito([1, 2], '2028-02-20', '2028-02-21', 'Boyd & Vandenberghe: convexity, QP', '(to confirm)', { hitoAConfirmar: true }),
  hito([3, 5], '2028-02-22', '2028-02-24', 'Cornuéjols & Tütüncü: Markowitz, efficient frontier', '(to confirm)', { hitoAConfirmar: true }),
] });
add({ id: 'Q5', fase: 'F9', tipo: 'proyecto', nombre: 'Comando', inicio: '2028-02-25', fin: '2028-03-10', horas: 150, horasLim: 170, versiones: [v('1.0', '2028-02-25', '2028-02-28'), v('1.1', '2028-02-29', '2028-03-03'), v('2.0', '2028-03-04', '2028-03-06'), v('3.0', '2028-03-07', '2028-03-10')] });
add({ id: 'Q6', fase: 'F9', tipo: 'proyecto', nombre: 'Ticker', inicio: '2028-03-11', fin: '2028-03-22', horas: 120, horasLim: 140, versiones: [v('1.0', '2028-03-11', '2028-03-13'), v('1.1', '2028-03-14', '2028-03-16'), v('2.0', '2028-03-17', '2028-03-19'), v('3.0', '2028-03-20', '2028-03-22')] });
add({ id: 'CW11', fase: 'F9', tipo: 'cert', nombre: 'AWS Security Specialty', inicio: '2028-03-23', fin: '2028-03-30', horas: 82, certs: [
  cert('aws-scs', 'AWS Security Specialty', 82, ['Course', 'Tutorials Dojo'], [['2028-03-23', 'Course'], ['2028-03-24', 'Course'], ['2028-03-25', 'Course'], ['2028-03-26', 'KMS / GuardDuty / Security Hub labs'], ['2028-03-27', 'Mocks'], ['2028-03-28', 'Mocks'], ['2028-03-29', 'Review'], ['2028-03-30', 'Exam']], '2028-03-30', { listo: 80 }),
] });
add({ id: 'J9', fase: 'F9', tipo: 'busqueda', nombre: 'Job search E#9', inicio: '2028-03-31', fin: '2028-04-03', horas: 42, busqueda: { reparto: { ingles: 3, busqueda: 7 } } });
add({ id: 'CIE3', fase: 'F9', tipo: 'cierre', nombre: 'Stage close', inicio: '2028-04-04', fin: '2028-04-15' });

// STAGE 4 · PHASE 10
add({ id: 'WA1', fase: 'F10', tipo: 'ventana', nombre: 'Math WA1', inicio: '2028-04-16', fin: '2028-04-25', horas: 103, libros: ['Boyce & DiPrima (ODEs)', 'Diebel (rigid body)'], hitos: [
  hito([1, 4], '2028-04-16', '2028-04-19', 'ODEs 1st/2nd order', '(to confirm)', { hitoAConfirmar: true }),
  hito([5, 7], '2028-04-20', '2028-04-22', 'Systems + numerical methods (Euler, RK4)', '(to confirm)', { hitoAConfirmar: true }),
  hito([8, 10], '2028-04-23', '2028-04-25', 'Rigid body: Euler angles, quaternions (Diebel)', '(to confirm)', { hitoAConfirmar: true }),
] });
add({ id: 'A1', fase: 'F10', tipo: 'proyecto', nombre: 'Trayecta', inicio: '2028-04-26', fin: '2028-05-13', horas: 185, horasLim: 195, versiones: [v('1.0', '2028-04-26', '2028-04-29'), v('1.1', '2028-04-30', '2028-05-04'), v('2.0', '2028-05-05', '2028-05-09'), v('3.0', '2028-05-10', '2028-05-13')] });
add({ id: 'WA2', fase: 'F10', tipo: 'ventana', nombre: 'Math WA2', inicio: '2028-05-14', fin: '2028-05-21', horas: 83, libros: ['PDE intro', 'Logan, A First Course in the Finite Element Method'], hitos: [
  hito([1, 2], '2028-05-14', '2028-05-15', 'PDE intro (heat, wave, Laplace)', '(to confirm)', { hitoAConfirmar: true }),
  hito([3, 8], '2028-05-16', '2028-05-21', 'Logan: finite elements', '(to confirm)', { hitoAConfirmar: true }),
] });
add({ id: 'A2', fase: 'F10', tipo: 'proyecto', nombre: 'Malla', inicio: '2028-05-22', fin: '2028-06-08', horas: 175, horasLim: 185, versiones: [v('1.0', '2028-05-22', '2028-05-25'), v('1.1', '2028-05-26', '2028-05-30'), v('2.0', '2028-05-31', '2028-06-04'), v('3.0', '2028-06-05', '2028-06-08')] });
add({ id: 'DES4', fase: 'F10', tipo: 'descanso', nombre: 'Rest', inicio: '2028-06-09', fin: '2028-06-15' });
add({ id: 'WA3', fase: 'F10', tipo: 'ventana', nombre: 'Math WA3', inicio: '2028-06-16', fin: '2028-06-25', horas: 104, libros: ['Anderson, Fundamentals of Aerodynamics (ch. 1–5)', 'LeVeque, Finite Volume Methods for Hyperbolic Problems'], hitos: [
  hito([1, 6], '2028-06-16', '2028-06-21', 'Anderson ch. 1–5', '(to confirm)', { hitoAConfirmar: true }),
  hito([7, 10], '2028-06-22', '2028-06-25', 'LeVeque (intro, Euler equations)', '(to confirm)', { hitoAConfirmar: true }),
] });
add({ id: 'A3', fase: 'F10', tipo: 'proyecto', nombre: 'Viento', inicio: '2028-06-26', fin: '2028-07-10', horas: 145, horasLim: 150, versiones: [v('1.0', '2028-06-26', '2028-06-29'), v('1.1', '2028-06-30', '2028-07-03'), v('2.0', '2028-07-04', '2028-07-06'), v('3.0', '2028-07-07', '2028-07-10')] });
add({ id: 'JP10', fase: 'F10', tipo: 'busqueda', nombre: 'Job search (short)', inicio: '2028-07-11', fin: '2028-07-13', horas: 30, busqueda: { reparto: { ingles: 3, busqueda: 7 } } });
// PHASE 11
add({ id: 'WA4', fase: 'F11', tipo: 'ventana', nombre: 'Math WA4', inicio: '2028-07-14', fin: '2028-07-21', horas: 82, libros: ['Åström & Murray, Feedback Systems', 'Labbe, Kalman and Bayesian Filters in Python'], hitos: [
  hito([1, 5], '2028-07-14', '2028-07-18', 'Åström & Murray (PID, state feedback, LQR)', '(to confirm)', { hitoAConfirmar: true }),
  hito([6, 8], '2028-07-19', '2028-07-21', 'Labbe: Kalman filters', '(to confirm)', { hitoAConfirmar: true }),
] });
add({ id: 'A4', fase: 'F11', tipo: 'proyecto', nombre: 'Piloto', inicio: '2028-07-22', fin: '2028-08-09', horas: 190, horasLim: 200, versiones: [v('1.0', '2028-07-22', '2028-07-26'), v('1.1', '2028-07-27', '2028-07-31'), v('2.0', '2028-08-01', '2028-08-04'), v('3.0', '2028-08-05', '2028-08-09')] });
add({ id: 'CW12', fase: 'F11', tipo: 'cert', nombre: 'AWS SA Professional', inicio: '2028-08-10', fin: '2028-08-21', horas: 124, certs: [
  cert('aws-sap', 'AWS Solutions Architect Professional', 124, ['Course', 'Tutorials Dojo'], [['2028-08-10', 'Course (through 15 Aug)'], ['2028-08-16', 'Multi-account and network scenarios'], ['2028-08-17', 'Scenarios'], ['2028-08-18', 'Four timed mocks (through 20 Aug)'], ['2028-08-21', 'Exam']], '2028-08-21', { listo: 80 }),
] });
add({ id: 'J10', fase: 'F11', tipo: 'busqueda', nombre: 'Job search E#10', inicio: '2028-08-22', fin: '2028-08-25', horas: 40, busqueda: { reparto: { ingles: 3, busqueda: 7 } } });
add({ id: 'WA5', fase: 'F11', tipo: 'ventana', nombre: 'Math WA5', inicio: '2028-08-26', fin: '2028-08-30', horas: 52, libros: ['Curtis, Orbital Mechanics for Engineering Students', 'Vallado (SGP4 reference)'], hitos: [
  hito([1, 3], '2028-08-26', '2028-08-28', 'Curtis: two-body, orbital elements', '(to confirm)', { hitoAConfirmar: true }),
  hito([4, 5], '2028-08-29', '2028-08-30', 'Perturbations J2, maneuvers (Vallado as SGP4 reference)', '(to confirm)', { hitoAConfirmar: true }),
] });
add({ id: 'A5', fase: 'F11', tipo: 'proyecto', nombre: 'Órbita', inicio: '2028-08-31', fin: '2028-09-15', horas: 155, horasLim: 165, versiones: [v('1.0', '2028-08-31', '2028-09-03'), v('1.1', '2028-09-04', '2028-09-07'), v('2.0', '2028-09-08', '2028-09-11'), v('3.0', '2028-09-12', '2028-09-15')] });
add({ id: 'A6', fase: 'F11', tipo: 'proyecto', nombre: 'Upstream', inicio: '2028-09-16', fin: '2028-09-25', horas: 100, horasLim: 105, versiones: [v('1.0', '2028-09-16', '2028-09-18'), v('2.0', '2028-09-19', '2028-09-22'), v('3.0', '2028-09-23', '2028-09-25')] });
add({ id: 'A7', fase: 'F11', tipo: 'proyecto', nombre: 'Horizonte', inicio: '2028-09-26', fin: '2028-10-15', horas: 200, horasLim: 230, versiones: [v('1.0', '2028-09-26', '2028-09-30'), v('1.1', '2028-10-01', '2028-10-05'), v('2.0', '2028-10-06', '2028-10-10'), v('3.0', '2028-10-11', '2028-10-15')] });
add({ id: 'CIE4', fase: 'F11', tipo: 'cierre', nombre: 'Close & renewals', inicio: '2028-10-16', fin: '2028-10-27' });

// ——— PetrIA batches ———
const LOTES = [
  ['0.0', 'pre-1.0', 'Onboarding', 1.5, '2026-11-21', '2026-11-21', 'Opus high'], ['0.1', 'pre-1.0', 'Repos, CI & Docker', 3, '2026-11-21', '2026-11-21', 'Sonnet medium'],
  ['0.2', 'pre-1.0', 'Database & roles', 2.5, '2026-11-21', '2026-11-21', 'Opus high'], ['1.1', '1.0', 'Ingest & cleaning', 7, '2026-11-22', '2026-11-23', 'Opus xhigh'],
  ['1.2', '1.0', 'Messaging & concessions', 3, '2026-11-22', '2026-11-23', 'Sonnet high'], ['1.3', '1.0', 'Features & baseline', 6, '2026-11-23', '2026-11-24', 'Opus xhigh'],
  ['1.4', '1.0', 'P10/P50/P90 detector', 7, '2026-11-23', '2026-11-26', 'Opus xhigh'], ['1.5', '1.0', 'Read API', 4, '2026-11-24', '2026-11-27', 'Opus high'],
  ['1.6', '1.0', 'Map', 5, '2026-11-24', '2026-11-28', 'Fable xhigh'], ['1.7', '1.0', 'Assistant with citations', 6, '2026-11-25', '2026-11-30', 'Opus xhigh'],
  ['1.8', '1.0', 'Production 1.0 + release', 2, '2026-11-25', '2026-12-01', 'Sonnet high'], ['2.1', '1.1', 'Well value & decline', 7, '2026-11-26', '2026-12-03', 'Opus high'],
  ['2.2', '1.1', 'Daily-report reader', 7, '2026-11-26', '2026-12-05', 'Opus high'], ['2.3', '1.1', 'Login & companies', 8, '2026-11-27', '2026-12-07', 'Opus xhigh'],
  ['2.4', '1.1', 'Serious AI + feedback loop', 8.5, '2026-11-28', '2026-12-08', 'Opus high'], ['2.5', '1.1', 'Quality', 6, '2026-11-29', '2026-12-09', 'Sonnet high'],
  ['2.6', '1.1', 'Observability, evals in CI & security', 8, '2026-11-29', '2026-12-11', 'Opus high'], ['2.7', '1.1', '1.1 screens + release', 4, '2026-11-30', '2026-12-12', 'Fable high'],
  ['3.1', '2.0', 'notification-service', 8, '2026-11-30', '2026-12-14', 'Opus high'], ['3.2', '2.0', 'Real channels', 9, '2026-12-01', '2026-12-16', 'Opus high'],
  ['3.3', '2.0', 'voice-gateway', 10, '2026-12-02', '2026-12-19', 'Opus xhigh'], ['3.4', '2.0', 'Usage & quotas', 6, '2026-12-03', '2026-12-20', 'Sonnet high'],
  ['3.5', '2.0', 'Design system + 2.0 release', 7, '2026-12-04', '2026-12-22', 'Fable high'], ['4.1', '3.0', 'load-lab', 14, '2026-12-05', '2026-12-25', 'Opus high'],
  ['4.2', '3.0', 'Operations', 12, '2026-12-06', '2026-12-28', 'Opus high'], ['4.3', '3.0', 'Ingest on AWS', 10, '2026-12-07', '2026-12-30', 'Opus high'],
  ['4.4', '3.0', 'Physical layer', 14, '2026-12-08', '2027-01-03', 'Fable high'], ['4.5', '3.0', 'Scale report + 3.0 release', 8, '2026-12-09', '2027-01-05', 'Sonnet medium'],
].map(([id, version, nombre, horas, estimado, deadline, modelo]) => ({ id, version: version === 'pre-1.0' ? '1.0' : version, ola0: version === 'pre-1.0', nombre, horas, estimado, deadline, modelo }));

// ——— build plan-extendido.json ———
const dias = (a, z) => Math.round((Date.parse(z) - Date.parse(a)) / 864e5) + 1;
const bloques = B.map((b) => {
  const o = viejo(b.id) ?? {};
  const out = {
    ...o, id: b.id, etapa: ETAPAS.find((e) => b.inicio >= (b.id === 'P0' || b.id === 'P1V0' ? '2026-11-16' : e.inicio) && b.inicio <= e.fin)?.n ?? 1,
    tipo: b.tipo, nombre: b.nombre, base: Math.max(1, Math.round(dias(b.inicio, b.fin) / 7)), extra: 0, extraPlataforma: 0, extraArquitectura: 0,
    fechas: { inicio: b.inicio, fin: b.fin }, roadmap: { inicio: b.inicio, fin: b.fin },
  };
  for (const k of ['horas', 'horasAntes', 'dias', 'numero', 'nota', 'corto', 'cert', 'recortarPrimero', 'que']) delete out[k];
  if (b.fase) out.fase = b.fase;
  for (const k of ['horas', 'horasLim', 'rol', 'entrevista', 'notas', 'nota', 'papers', 'hitos', 'libros', 'ingles', 'busqueda', 'mercado', 'roles', 'archivado', 'sinAtraso']) if (b[k] !== undefined) out[k] = b[k];
  if (b.certs) out.certs = b.certs.map((c) => {
    const v7 = viejo(CERT_V7[c.id]);
    const anos = VALIDEZ[c.id];
    return { ...c, ...(v7?.cert?.costo ? { costo: v7.cert.costo, costoVerificado: !!v7.cert.verificado } : {}), ...(v7?.cert?.versiones && c.id === 'secplus' ? { versiones: v7.cert.versiones } : {}),
      renovacion: c.id === 'pnpt' ? { nota: 'no expiry (to verify)' } : anos ? { anos, nota: 'usual validity (to verify)' } : { nota: 'validity to verify' } };
  });
  if (b.tipo === 'proyecto' && !out.ficha) out.ficha = { perfil: b.rol ?? 'to confirm' };
  if (b.tipo === 'proyecto' && !out.tecnologias) out.tecnologias = [];
  if (b.tipo === 'ventana' && o.mate) out.mate = { ...o.mate, principal: b.libros ?? o.mate.principal };
  if (b.tipo === 'ventana' && !o.mate) out.mate = { principal: b.libros, refuerzo: [], habilita: [], perfil: b.nombre };
  if (b.id === 'P1') out.lotes = LOTES;
  if (b.tipo === 'proyecto' && b.horas == null) delete out.horas;
  return out;
});
// Dependencies only on windows that still come before.
const pos = new Map(bloques.map((b, i) => [b.id, i]));
for (const b of bloques) {
  if (b.dependeDe) b.dependeDe = b.dependeDe.filter((w) => pos.has(w) && pos.get(w) < pos.get(b.id));
  if (b.dependeDe && !b.dependeDe.length) delete b.dependeDe;
  if (b.mate?.habilita) b.mate.habilita = b.mate.habilita.filter((h) => pos.has(h) && pos.get(h) > pos.get(b.id));
}

const RUTINA_HABITOS = [
  { id: 'recall', nombre: 'Trazo recall (incl. 20 LLM concepts)', cuando: 'diario', hora: '16:55' },
  { id: 'anki', nombre: 'Anki', cuando: 'diario', hora: '17:15' },
  { id: 'post', nombre: 'LinkedIn post (EN + ES) + X thread (EN)', cuando: [2, 4], hora: '17:30' },
  { id: 'demo', nombre: 'Weekly demo + mock interview', cuando: [6], hora: '15:45' },
  { id: 'revision', nombre: 'Weekly review (hours, comprehension debt, english.md, exam bookings, Claude usage)', cuando: [7], hora: '15:45' },
];
const RECORDATORIOS = [
  { id: 'reserva-claude-gh', texto: 'Book Claude Architect + GitHub Foundations exams', fecha: '2026-11-21', certs: ['claude-architect', 'gh-foundations'] },
  { id: 'reserva-ai103-databricks', texto: 'Book Azure AI-103 + Databricks GenAI exams', fecha: '2026-12-20', certs: ['ai-103', 'databricks-genai'] },
  { id: 'reserva-cambridge', texto: 'Book Cambridge C1 Advanced (week of 11–17 Mar 2027)', fecha: '2027-01-14' },
  // Every remaining exam: the day its preceding project starts.
  { id: 'reserva-cw3', texto: 'Book AWS MLA + GitHub Actions exams', fecha: '2026-12-21', certs: ['aws-mla', 'gh-actions'], regla: 'preceding project starts (VitalIA)' },
  { id: 'reserva-cw4', texto: 'Book AWS SAA + Prometheus exams', fecha: '2027-02-19', certs: ['aws-saa', 'prometheus'], regla: 'preceding project starts (AgrIA)' },
  { id: 'reserva-cw5', texto: 'Book AWS Developer + Terraform exams', fecha: '2027-03-18', certs: ['aws-dva', 'terraform'], regla: 'preceding project starts (Antena)' },
  { id: 'reserva-cw678', texto: 'Book Security+, GHAS, CKA, OpenTelemetry, AWS GenAI Pro and Claude Developer exams', fecha: '2027-04-18', certs: ['secplus', 'ghas', 'cka', 'otel', 'aws-genai-pro', 'claude-dev'], regla: 'preceding project starts (PetrIA Guard)' },
  { id: 'reserva-pnpt', texto: 'Book the PNPT exam', fecha: '2027-10-15', certs: ['pnpt'], regla: 'preceding project starts (Vigía)' },
  { id: 'reserva-cks', texto: 'Book the CKS exam (requires an active CKA)', fecha: '2028-01-30', certs: ['cks'], regla: 'preceding project starts (Matchbook)' },
  { id: 'reserva-scs', texto: 'Book the AWS Security Specialty exam', fecha: '2028-03-11', certs: ['aws-scs'], regla: 'preceding project starts (Ticker)' },
  { id: 'reserva-sap', texto: 'Book the AWS SA Professional exam', fecha: '2028-07-22', certs: ['aws-sap'], regla: 'preceding project starts (Piloto)' },
];
const LLM = ['tokenization', 'next-token prediction', 'pretraining', 'scaling laws', 'positional encoding', 'multi-head attention', 'context window', 'KV cache', 'temperature', 'top-p sampling', 'hallucination', 'fine-tuning', 'RLHF', 'LoRA', 'quantization', 'distillation', 'mixture of experts', 'chain of thought', 'RAG', 'tool calling'];

const out = {
  version: 1, plan: 'v12.1', t0: '2026-11-16', archivado: 'data/archivo/roadmap-v7/ (roadmap v7, archived 20 Nov 2026)',
  etapas: ETAPAS.map((e) => ({ ...e, semanasBase: bloques.filter((b) => b.etapa === e.n).reduce((s, b) => s + b.base, 0), semanasExtra: 0, semanasPlataforma: 0, semanasArquitectura: 0 })),
  fases: FASES, bloques,
  matematica: { ...V7.matematica, diarios: {} },
  perfilesHito: [{ despues: 'COL', perfil: 'Senior ML + DevSecOps + Cloud', nota: 'Close of stage 1' }, { despues: 'CIE2', perfil: 'Security Engineer', nota: 'Close of stage 2' }, { despues: 'CIE3', perfil: 'Quant Trading Engineer', nota: 'Close of stage 3' }, { despues: 'CIE4', perfil: 'GNC / Mission Software Engineer', nota: 'Close of stage 4' }],
  decisiones: [], descartadas: V7.descartadas, backlog: V7.backlog,
  capacidad: { lv: 10, finde: 11, pausasDiciembre: [2027], inicioTrabajoDias: null, fijas: [{ inicio: '2027-12-20', fin: '2027-12-26', nombre: 'Pause' }] },
  habitos: RUTINA_HABITOS, recordatorios: RECORDATORIOS, mazoLLM: LLM,
  papersSueltos: [{ id: 'gans', nombre: 'GANs (2014)', opcional: true }, { id: 'ddpm', nombre: 'DDPM diffusion (2020)', opcional: true }],
};
writeFileSync(join(RAIZ, 'data/plan-extendido.json'), JSON.stringify(out, null, 1) + '\n');

// ——— versions with dates (proyectos-v7.json) ———
const proyectos = {};
for (const b of B.filter((x) => x.versiones)) {
  const prev = PV7.proyectos[b.id] ?? PV7.proyectos.P0;
  const viejas = new Map((prev?.versiones ?? []).map((x) => [x.id, x]));
  proyectos[b.id] = {
    ...(prev ?? { puesto: b.rol ?? '' }),
    ...(b.rol ? { puesto: b.rol } : {}),
    versiones: b.versiones.map((x) => {
      const lotes = b.id === 'P1' ? LOTES.filter((l) => l.version === x.id) : [];
      const horas = lotes.length ? Math.round(lotes.reduce((s, l) => s + l.horas, 0) * 10) / 10 : undefined;
      return { id: x.id, nombre: viejas.get(x.id)?.nombre ?? { '1.0': 'MVP', '1.1': 'Producto', '2.0': 'Plataforma', '2.1': 'Completa', '3.0': 'Producción' }[x.id], inicio: x.inicio, fin: x.fin, ...(x.deadline ? { deadline: x.deadline } : {}), ...(x.nota ? { nota: x.nota } : {}), ...(horas != null ? { horas } : {}), alcance: viejas.get(x.id)?.alcance ?? [] };
    }),
  };
}
// Horas por versión (las demás): repartidas por días entre las horas del bloque.
for (const b of B.filter((x) => x.versiones && x.id !== 'P1')) {
  const vs = proyectos[b.id].versiones;
  const total = vs.reduce((s, x) => s + dias(x.inicio, x.fin), 0);
  let resto = b.horas;
  vs.forEach((x, i) => { const h = i === vs.length - 1 ? resto : Math.round((b.horas * dias(x.inicio, x.fin)) / total); x.horas = h; x.derivadas = true; resto -= h; });
}
proyectos.P0 = { ...PV7.proyectos.P0, versiones: PV7.proyectos.P0.versiones.filter((x) => x.id === '1.0') };
writeFileSync(join(RAIZ, 'data/proyectos-v7.json'), JSON.stringify({ ...PV7, plan: 'v12.1', proyectos }, null, 1) + '\n');
const sumaLotes = LOTES.reduce((s, l) => s + l.horas, 0);
console.log(`${bloques.length} blocks · ${FASES.length} phases · ${bloques.flatMap((b) => b.certs ?? []).length} certs · PetrIA batches ${sumaLotes} h (plan says 194.5 h)`);
