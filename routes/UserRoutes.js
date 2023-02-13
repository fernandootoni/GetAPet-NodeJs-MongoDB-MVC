const router = require('express').Router()
const UserController = require('../controllers/UserController')

//Middleware
const verifyToken = require('../helper/verify-token')
const { imageUpload } = require('../helper/image-upload')

router.post('/register', UserController.register)
router.post('/login', UserController.login)
router.get('/checkuser', UserController.checkUser)
router.get('/:id', UserController.getUserById)
router.patch('/edit/:id', verifyToken, imageUpload.single('image'), UserController.editUser)

module.exports = router