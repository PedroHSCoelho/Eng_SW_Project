import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.json({
    data: [
      { position: 1, player: 'João', points: 21, goals: 12 },
      { position: 2, player: 'Lucas', points: 18, goals: 9 },
      { position: 3, player: 'Pedro', points: 15, goals: 6 },
    ],
  })
})

export default router
