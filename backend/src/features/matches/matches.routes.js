import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.json({
    data: [
      { id: 1, date: '2026-10-10', homeTeam: 'Time A', awayTeam: 'Time B', score: '3x2' },
      { id: 2, date: '2026-10-12', homeTeam: 'Time C', awayTeam: 'Time D', score: '1x1' },
    ],
  })
})

export default router
