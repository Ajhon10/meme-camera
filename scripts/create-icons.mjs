// Format the supplied photo as Windows icons without changing its content.
import { app, nativeImage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
app
  .whenReady()
  .then(() => {
    const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/memes')
    const source = nativeImage.createFromPath(path.join(directory, 'app-icon-source.jpg'))
    if (source.isEmpty()) throw new Error('The app icon source could not be read.')
    const sizes = [16, 24, 32, 48, 64, 128, 256]
    const images = sizes.map((size) =>
      source.resize({ width: size, height: size, quality: 'best' }).toPNG(),
    )
    fs.writeFileSync(path.join(directory, 'app-icon.png'), images.at(-1))
    const header = Buffer.alloc(6 + sizes.length * 16)
    header.writeUInt16LE(1, 2)
    header.writeUInt16LE(sizes.length, 4)
    let offset = header.length
    sizes.forEach((size, index) => {
      const entry = 6 + index * 16
      header[entry] = header[entry + 1] = size === 256 ? 0 : size
      header.writeUInt16LE(1, entry + 4)
      header.writeUInt16LE(32, entry + 6)
      header.writeUInt32LE(images[index].length, entry + 8)
      header.writeUInt32LE(offset, entry + 12)
      offset += images[index].length
    })
    fs.writeFileSync(path.join(directory, 'app-icon.ico'), Buffer.concat([header, ...images]))
    console.log('Created PNG and seven-size Windows ICO from the supplied photo.')
    app.quit()
  })
  .catch((error) => {
    console.error(error)
    app.exit(1)
  })
