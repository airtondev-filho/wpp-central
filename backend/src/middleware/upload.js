import multer from 'multer'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export const uploadDir = path.join(process.cwd(), 'uploads')
fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
})

export const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } })
