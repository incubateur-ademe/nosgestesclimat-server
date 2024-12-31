import fs from 'fs'
import yaml from 'yaml'

export const readYAML = (path: fs.PathOrFileDescriptor) => {
  return yaml.parse(fs.readFileSync(path, 'utf-8'))
}
