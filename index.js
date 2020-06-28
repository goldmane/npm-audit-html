#!/usr/bin/env node

const program = require('commander')
const updateNotifier = require('update-notifier')
const fs = require('fs-extra')
const path = require('path')

const reporter = require('./lib/reporter')
const pkg = require('./package.json')

updateNotifier({ pkg }).notify()

let stdin = ''

program
  .version(pkg.version)
  .option('-o, --output [output]', 'output file')
  .option('-i, --input [input]', 'input file')
  .option(
    '-c, --theme [theme name]',
    'template theme `dark` or `light` (defaults to `light`)'
  )
  .option('-t, --template [handlebars file]', 'handlebars template file')
  .option('-a, --useLocalAssets', 'copies and references local assets')
  .action(async (cmd, env) => {
    try {
      let data
      if (cmd.input) {
        data = await fs.readJson(cmd.input)
      } else if (stdin) {
        data = JSON.parse(stdin)
      } else {
        console.log('No input')
        return process.exit(1)
      }

      await genReport(data, cmd.output, cmd.template, cmd.theme, cmd.useLocalAssets)
    } catch (err) {
      console.error('Failed to parse NPM Audit JSON!')
      return process.exit(1)
    }
  })

const copyAssets = async (output) => {
  var cssDir = path.join(path.dirname(output), 'css')
  await fs.copy(
    `${__dirname}/node_modules/bootstrap-material-design/dist/css/bootstrap-material-design.min.css`,
    path.join(cssDir, `bootstrap-material-design.min.css`)
  )
  await fs.copy(
    `${__dirname}/node_modules/highlight.js/styles/atom-one-dark.css`,
    path.join(cssDir, `atom-one-dark.css`)
  )
  await fs.copy(
    `${__dirname}/node_modules/datatables/media/css/jquery.dataTables.min.css`,
    path.join(cssDir, `datatables.min.css`)
  )

  var jsDir = path.join(path.dirname(output), 'js')
  await fs.copy(
    `${__dirname}/node_modules/datatables/media/js/jquery.dataTables.min.js`,
    path.join(jsDir, `datatables.min.js`)
  )
  await fs.copy(
    `${__dirname}/node_modules/jquery/dist/jquery.slim.min.js`,
    path.join(jsDir, `jquery.slim.min.js`)
  )
  await fs.copy(
    `${__dirname}/node_modules/bootstrap/dist/js/bootstrap.min.js`,
    path.join(jsDir, `bootstrap.min.js`)
  )

  console.log('Assets copied')
}

const genReport = async (
  data,
  output = 'npm-audit.html',
  template,
  theme = 'light',
  useLocalAssets
) => {
  try {
    if (!data) {
      console.log('No JSON')
      return process.exit(1)
    }

    if (useLocalAssets) {
      await copyAssets(output)
    }
    const templateFile = template || `${__dirname}/templates/template.hbs`

    await reporter(data, templateFile, output, theme, useLocalAssets)

    console.log(`Vulnerability snapshot saved at ${output}`)
    process.exit(0)
  } catch (err) {
    console.log('An error occurred!')
    console.log(err)
    process.exit(1)
  }
}

if (process.stdin.isTTY) {
  program.parse(process.argv)
} else {
  process.stdin.on('readable', function () {
    const chunk = this.read()
    if (chunk !== null) {
      stdin += chunk
    }
  })
  process.stdin.on('end', function () {
    program.parse(process.argv)
  })
}
