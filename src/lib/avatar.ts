const SIZE = 256
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

/** Crops a photo to a centred square, shrinks it to 256px and returns a small JPEG data URL. */
export async function photoToAvatar(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP photo.')
  if (file.size > 10 * 1024 * 1024) throw new Error('That photo is over 10MB. Choose a smaller one.')

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Could not read that photo.')
  })
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not process that photo.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, SIZE, SIZE)
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}
