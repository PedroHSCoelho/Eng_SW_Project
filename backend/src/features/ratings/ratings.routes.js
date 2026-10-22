import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.json({
    data: [
      { player: 'João', average: 4.8 },
      { player: 'Lucas', average: 4.5 },
      { player: 'Pedro', average: 4.2 },
    ],
  })
})

export default router
