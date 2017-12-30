import * as path from 'path'
import { defineSupportCode, TableDefinition, World } from 'cucumber'
import { generateCode } from '../../src'

defineSupportCode(function({ Given, When, Then }) {
  Given('a schema looking like this:', function(schema) {
    this.schema = schema
  })

  Given('I pick generator {string}', function(generator) {
    this.generator = generator
  })

  When('I run the generator', function() {
    this.result = generateCode(this.schema, this.generator)
    this.attach(this.result, 'application/typescript');
  })

  Then('I expect the output to be:', function(output) {
    console.assert(normalizeText(this.result) == normalizeText(output), output)
  })
})

function normalizeText(text) {
  return text
    .replace(/\033\[[0-9;]*m/g, '')
    .replace(/\r\n|\r/g, '\n')
    .trim()
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\d+m\d{2}\.\d{3}s/, '<duration-stat>')
    .replace(/\d+(.\d+)?ms/g, '<d>ms')
    .replace(/\//g, path.sep)
    .replace(/ +/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
}
