import type { EffectDefinition } from './effectTypes'
import { gestureOptions, targetOptions } from './effectTypes'

let database: Promise<IDBDatabase> | undefined
function openDatabase() {
  if (database) return database
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false
    const fail = (detail: string) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(
        new Error(
          `Cannot access saved effects. Close other MemeCam windows, including older development copies, then restart MemeCam. Your saved data has not been deleted. ${detail}`,
        ),
      )
    }
    const timeout = setTimeout(() => fail('The local database did not respond.'), 10000)
    try {
      const request = indexedDB.open('memecam', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('effects', { keyPath: 'id' })
      request.onblocked = () => fail('Another window is holding the database open.')
      request.onerror = () => fail(request.error?.message ?? 'The local database could not open.')
      request.onsuccess = () => {
        const connection = request.result
        if (settled) {
          connection.close()
          return
        }
        settled = true
        clearTimeout(timeout)
        connection.onversionchange = () => {
          connection.close()
          if (database === opening) database = undefined
        }
        connection.onclose = () => {
          if (database === opening) database = undefined
        }
        resolve(connection)
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error))
    }
  })
  database = opening
  // A rejected or timed-out connection must not poison every later toggle/save.
  void opening.catch(() => {
    if (database === opening) database = undefined
  })
  return opening
}
export async function loadEffects(): Promise<EffectDefinition[]> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction('effects').objectStore('effects').getAll()
    request.onsuccess = () => {
      const rows: unknown[] = request.result
      if (!rows.every(validEffect)) {
        reject(
          new Error('Saved effects are invalid. Remove MemeCam site data to reset the library.'),
        )
        return
      }
      resolve(rows)
    }
    request.onerror = () => reject(request.error)
  })
}
function validEffect(value: unknown): value is EffectDefinition {
  if (!value || typeof value !== 'object') return false
  const effect = value as Partial<EffectDefinition>
  return (
    typeof effect.id === 'string' &&
    typeof effect.name === 'string' &&
    typeof effect.imagePath === 'string' &&
    (effect.imagePath.startsWith('./memes/') ||
      /^data:image\/(png|webp|jpeg);base64,/.test(effect.imagePath)) &&
    typeof effect.enabled === 'boolean' &&
    !!effect.trigger &&
    !!effect.target &&
    !!effect.display &&
    gestureOptions.some(
      (option) => option.id === effect.trigger!.gesture && option.type === effect.trigger!.type,
    ) &&
    targetOptions.includes(effect.target.type) &&
    ['while-triggered', 'timed', 'toggle'].includes(effect.display.mode) &&
    [
      effect.trigger.similarityThreshold,
      effect.target.scale,
      effect.target.offsetX,
      effect.target.offsetY,
      effect.target.rotationOffset,
      effect.display.durationMs,
    ].every(Number.isFinite) &&
    (effect.trigger.gesture !== 'custom-pose' ||
      (effect.trigger.savedPose?.version === 1 &&
        effect.trigger.savedPose.values.length === 16 &&
        effect.trigger.savedPose.values.every(Number.isFinite)))
  )
}
export async function persistEffect(effect: EffectDefinition) {
  const plain: EffectDefinition = JSON.parse(JSON.stringify(effect))
  if (!validEffect(plain)) throw new Error('Invalid effect configuration.')
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('effects', 'readwrite')
    transaction.objectStore('effects').put(plain)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Saving effect was cancelled.'))
  })
}
export async function deleteEffect(id: string) {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('effects', 'readwrite')
    transaction.objectStore('effects').delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Deleting effect was cancelled.'))
  })
}
export async function readEffectImage(file: File): Promise<string> {
  if (!['image/png', 'image/webp', 'image/jpeg'].includes(file.type))
    throw new Error('Choose a PNG, WebP, or JPEG image.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.')
  const bitmap = await createImageBitmap(file)
  const tooLarge = bitmap.width > 4096 || bitmap.height > 4096
  bitmap.close()
  if (tooLarge) throw new Error('Image dimensions must be 4096 × 4096 or smaller.')
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
