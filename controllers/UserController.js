const User = require('../models/User')

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

//helpers
const createUserToken = require('../helper/create-user-token')
const getToken = require('../helper/get-token')
const getUserByToken = require('../helper/get-user-by-token')

module.exports = class UserController {
  static async register(req, res) {
    const { name, email, phone, password, confirmpassword } = req.body

    //Validations
    if(!name) {
      res.status(422).json({ message: 'O nome é obrigatório' })
      return
    }
    if(!email) {
      res.status(422).json({ message: 'O email é obrigatório' })
      return
    }
    if(!phone) {
      res.status(422).json({ message: 'O telefone é obrigatório' })
      return
    }
    if(!password) {
      res.status(422).json({ message: 'A senha é obrigatória' })
      return
    }
    if(!confirmpassword) {
      res.status(422).json({ message: 'A senha de confirmação é obrigatória' })
      return
    }
    if(password != confirmpassword) {
      res.status(422).json({ message: 'As senhas precisam ser iguais' })
      return
    }

    //check if user exists
    const userExists = await User.findOne({ email: email})
    if(userExists) {
      res.status(422).json({ message: 'Por favor, utilize outro e-mail'})
      return
    }

    // create a password
    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    const user = new User ({
      name,
      email,
      phone,
      password: passwordHash
    })

    try {
      const newUser = await user.save()

      await createUserToken(newUser, req, res)
    } catch(err) {
      res.status(500).json({ message: err.message })
    }
  }

  static async login(req, res) {
    const { email, password } = req.body

    if(!email) {
      res.status(422).json({ message: 'O email é obrigatório' })
      return
    }
    if(!password) {
      res.status(422).json({ message: 'A senha é obrigatória' })
      return
    }

    const user = await User.findOne({ email: email})
    if(!user) {
      res.status(422).json({ message: 'Usuário inexistente!'})
      return
    }

    const checkPassword = await bcrypt.compare(password, user.password)
    if(!checkPassword){
      res.status(422).json({ message: 'Senha inválida!'})
      return
    }

    await createUserToken(user, req, res)
  }

  static async checkUser(req, res) {
    let currentUser

    if(req.headers.authorization) {
      const token = getToken(req)
      const decoded = jwt.verify(token, 'nossosecret')

      currentUser = await User.findById(decoded.id)
      currentUser.password = undefined
    } else {
      currentUser = null
    }

    res.status(200).send(currentUser)
  }

  static async getUserById(req, res) {
    const id = req.params.id

    const user = await User.findById(id).select('-password')
    if(!user){
      res.status(401).json({ message: 'Usuário não encontrado!'})
      return
    }

    res.status(200).json({ user })
  }

  static async editUser(req, res) {
    const id = req.params.id
    const { name, email, phone, password, confirmpassword } = req.body

    const token = getToken(req)
    const user = await getUserByToken(token)

    if(req.file) {
      user.image = req.file.filename
    }

    //Validations
    if(!name) {
      res.status(422).json({ message: 'O nome é obrigatório' })
      return
    }
    if(!email) {
      res.status(422).json({ message: 'O email é obrigatório' })
      return
    }

    const userExists = await User.findOne({ email: email })
    if(email !== user.email && userExists) {
      res.status(422).json({ message: 'E-mail já utilizado' })
      return
    }

    if(!phone) {
      res.status(422).json({ message: 'O telefone é obrigatório' })
      return
    }

    if(password != confirmpassword) {
      res.status(422).json({ message: 'As senhas precisam ser iguais' })
      return
    } else if(password === confirmpassword && password != null) {
      const salt = await bcrypt.genSalt(12)
      const passwordHash = await bcrypt.hash(password, salt)

      user.password = passwordHash
    }

    user.name = name
    user.email = email
    user.phone = phone

    try {
      await User.findOneAndUpdate(
        { _id: user._id },
        { $set: user },
        { new: true }
      )

      res.status(200).json({ message: 'Usuário atualizado com sucesso' })
    } catch (error) {
      res.status(500).json({ message: err })
    }
  }
}