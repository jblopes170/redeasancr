import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
const require = createRequire(import.meta.url)
const module = { exports: {} }
const source = readFileSync(new URL('../src/lib/navigation.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
new Function('require', 'exports', compiled)(require, module.exports)
const { isNavigationActive, getMemberSection, getEventSection, publicNavigation, adminNavigation } = module.exports
let checks = 0
function check(title, action) { action(); checks++; process.stdout.write(`OK ${title}\n`) }
check('Dedicated scoring route selects live navigation, not Events', () => {
  assert.equal(isNavigationActive('/admin/events/event-1/scores','/admin/live'), true)
  assert.equal(isNavigationActive('/admin/events/event-1/scores','/admin/eventos'), false)
})
check('Event detail selects Events and dashboard only matches its own page', () => {
  assert.equal(isNavigationActive('/admin/events/event-1','/admin/eventos'), true)
  assert.equal(isNavigationActive('/admin/events/event-1','/admin'), false)
  assert.equal(isNavigationActive('/admin/','/admin'), true)
})
check('Member deep links resolve to actual sections', () => {
  for (const [hash, id] of [['resumo','summary'],['nova-inscricao','new'],['inscricoes','registrations'],['resultados','results'],['sugestoes','suggestions']]) {
    assert.equal(getMemberSection(hash).id,id)
    assert.equal(getMemberSection('#'+hash).id,id)
  }
  assert.equal(getMemberSection('unknown').id,'summary')
})
check('Existing entry links and new settings deep links remain valid', () => {
  assert.equal(getEventSection('#inscricoes'),'entries')
  for (const id of ['overview','categories','records','entries','finance','import-export','settings']) assert.equal(getEventSection(id),id)
  assert.equal(getEventSection('unknown'),'overview')
})
check('Public and admin directories are independent destinations', () => {
  assert.ok(publicNavigation.some(item=>item.to==='/eventos'))
  assert.ok(publicNavigation.some(item=>item.to==='/noticias'))
  assert.ok(adminNavigation.some(item=>item.to==='/admin/eventos'))
  assert.ok(adminNavigation.some(item=>item.to==='/admin/live'))
})
check('Every new directory route is registered', () => {
  const routes=readFileSync(new URL('../src/routeTree.gen.ts',import.meta.url),'utf8')
  for(const path of ['/eventos','/noticias','/admin/eventos']) assert.ok(routes.includes(path))
})
console.log(`${checks} UX navigation checks passed.`)
