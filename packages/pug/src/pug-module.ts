import { ChowChow, Module, BaseContext } from '@robb_j/chowchow'
import pug from 'pug'
import globLib from 'glob'
import { promisify } from 'util'

const glob = promisify(globLib)

export type PugContext = {
  renderPug(templateName: string, locals?: any): string
  sendPug(templateName: string, locals?: any): void
}

export type PugTemplates = {
  [templateName: string]: (locals: { [prop: string]: any }) => string
}

export type PugOptions = {
  templateDir: string
  hotReloadInDev?: boolean
}

export class PugModule implements Module {
  app: ChowChow = null as any
  templateDir: string
  hotReload: boolean
  templates: PugTemplates

  constructor({ templateDir, hotReloadInDev = false }: PugOptions) {
    this.templateDir = templateDir
    this.templates = {}
    this.hotReload = hotReloadInDev && process.env.NODE_ENV === 'development'
  }

  checkEnvironment() {}

  async setupModule() {
    this.templates = await this.loadTemplates(this.templateDir)
  }
  clearModule() {}
  extendExpress() {}

  extendEndpointContext({ res }: BaseContext): PugContext {
    return {
      renderPug: (templateName, locals) => {
        return this.renderTemplate(templateName, locals)
      },
      sendPug: (templateName, locals) => {
        res.send(this.renderTemplate(templateName, locals))
      }
    }
  }

  trimTemplatePath(path: string, base: string) {
    return path.replace(base + '/', '').replace('.pug', '')
  }

  async loadTemplates(basedir: string) {
    const matches = await glob(`${basedir}/**/*.pug`)

    const templates: PugTemplates = {}

    for (let name of matches) {
      let trimmedName = this.trimTemplatePath(name, basedir)

      if (this.hotReload) {
        templates[trimmedName] = (...args: any[]) => {
          return pug.compileFile(name, { basedir })(...args)
        }
      } else {
        templates[trimmedName] = pug.compileFile(name, { basedir })
      }
    }

    return templates
  }

  renderTemplate(templateName: string, locals?: any) {
    if (!this.templates[templateName]) {
      throw new Error(`Invalid template '${templateName}'`)
    }
    return this.templates[templateName](locals)
  }
}