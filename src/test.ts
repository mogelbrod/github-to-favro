import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import fetch from 'node-fetch'

// @ts-ignore
globalThis.fetch = fetch

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import { githubEventToComments } from './commenter'

const tests = {
  issue: '',
  push: '',
  branch: '',
} as const

const testsArray = Object.keys(tests)

Promise.allSettled(
  testsArray.map((testId) => {
    return fs
      .readFile(path.join(__dirname, 'fixtures', testId + '.json'), 'utf8')
      .then((raw) => {
        const json = JSON.parse(raw)
        return githubEventToComments(json, { prefix: 'Sou' })
      })
  }),
).then((outcomes) => {
  outcomes.forEach((outcome, index) => {
    console.log(`\n##### ${testsArray[index]}`)
    switch (outcome.status) {
      case 'fulfilled':
        outcome.value.forEach(({ body }) => {
          console.log(body + '\n')
        })
        break
      case 'rejected':
        console.log(outcome.reason, '\n')
        break
    }
  })
})
