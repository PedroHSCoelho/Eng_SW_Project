import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.json({
    data: [
      { id: 1, name: 'João', totalGoals: 12, assists: 7, matchesPlayed: 9 },
      { id: 2, name: 'Lucas', totalGoals: 9, assists: 11, matchesPlayed: 9 },
      { id: 3, name: 'Pedro', totalGoals: 6, assists: 5, matchesPlayed: 8 },
    ],
  })
})

export default router
