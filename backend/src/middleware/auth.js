import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Não autorizado' })
  try {
    req.user = jwt.verify(h.slice(7), process.env.JWT_SECRET)
    next()
  } catch { res.status(401).json({ error: 'Token inválido' }) }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (!roles.includes(req.user.role))
        return res.status(403).json({ error: 'Acesso negado' })
      next()
    })
  }
}
