const fs = require('fs')
var Stats = require('fast-stats').Stats

let list = JSON.parse(fs.readFileSync('simu25-4.json', 'utf8'))
const filtered = list.filter(
  (line) => new Date(line.updatedAt) > new Date('2023-04-25T15:00:33.076Z')
)

console.log(list.length, filtered.length)

const getTotal = (line) => line.data.results.total
const mean =
  filtered.reduce((memo, next) => memo + getTotal(next), 0) / filtered.length

console.log(mean)

const totals = filtered.map(getTotal)

const s = new Stats().push(...totals)

console.log('amean', s.amean())
console.log('median', s.median())

const max = Math.max(...totals)

console.log(max)

console.log('range', s.range())
const s2 = s.band_pass(1500, 30000)
console.log('range 1.5 30', s2.range())

console.log('mean', s2.amean())
