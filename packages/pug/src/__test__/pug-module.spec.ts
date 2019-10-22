import { PugModule } from '../pug-module'
import { join } from 'path'

describe('PugModule', () => {
  let pug: PugModule

  beforeEach(() => {
    pug = new PugModule({
      templateDir: join(__dirname, '../__mock__'),
      globals: { age: 42 }
    })
  })

  describe('#setupModule', () => {
    it('should load templates', async () => {
      await pug.setupModule()

      const templates = Object.keys(pug.templates)

      expect(templates).toContain('name-template')
      expect(templates).toContain('age-template')
      expect(templates).toContain('nested/template')
    })
  })

  describe('#trimTemplatePath', () => {
    it('should remove the basepath and extension', () => {
      let base = '/some/big/path'
      let input = '/some/big/path/my-template.pug'

      let result = pug.trimTemplatePath(input, base)

      expect(result).toEqual('my-template')
    })
  })

  describe('#renderTemplate', () => {
    it('should render the template with passed variables', async () => {
      await pug.setupModule()

      let result = pug.renderTemplate('name-template', { name: 'geoff' })

      expect(result).toEqual('<h1>Hey, geoff!</h1>')
    })
    it('should render in hot mode', async () => {
      pug.hotReload = true
      await pug.setupModule()

      let result = pug.renderTemplate('name-template', { name: 'geoff' })

      expect(result).toEqual('<h1>Hey, geoff!</h1>')
    })
    it('should merge in locals and globals', async () => {
      await pug.setupModule()

      let result = pug.renderTemplate('age-template', { name: 'geoff' })

      expect(result).toEqual('<p>geoff is 42</p>')
    })
  })
})
