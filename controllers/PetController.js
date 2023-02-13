const Pet = require('../models/Pet')
const getToken = require('../helper/get-token')
const getUserByToken = require('../helper/get-user-by-token')

const ObjectId = require('mongoose').Types.ObjectId

module.exports = class PetController {
  static async create(req, res) {
    const { name, age, weight, color } = req.body
    const available = true

    //Images upload
    const images = req.files

    //Validations
    if(!name) {
      res.status(422).json({ message: 'O nome é obrigatório!'})
      return
    }
    if(!age) {
      res.status(422).json({ message: 'A idade é obrigatória!'})
      return
    }
    if(!weight) {
      res.status(422).json({ message: 'O peso é obrigatório!'})
      return
    }
    if(!color) {
      res.status(422).json({ message: 'A cor é obrigatória!'})
      return
    }
    if(images.length === 0){
      res.status(422).json({ message: 'A imagem é obrigatória!'})
      return
    }

    //Get pet owner
    const token = getToken(req)
    const user = await getUserByToken(token)

    //Create a pet
    const pet = new Pet({
      name,
      age,
      weight,
      color,
      available,
      images: [],
      user: {
        _id: user.id,
        name: user.name,
        phone: user.phone,
        image: user.image
      },
    })

    images.map((image) => {
      pet.images.push(image.filename)
    })

    try {
      const newPet = await pet.save()
      res.status(201).json({ message: 'Pet cadastrado com sucesso!', newPet })
    } catch (error) {
      res.status(500).json({ message: 'Erro ao cadastrar o pet!' })
    }
  }

  static async getAll(req, res) {
    const pets = await Pet.find().sort('-createdAt')

    res.status(200).json({
      pets: pets
    })
  }

  static async getAllUserPets(req, res) {
    const token = getToken(req)
    const user = await getUserByToken(token)

    const userPets = await Pet.find({'user._id': String(user._id)}).sort('-createdAt')

    res.status(200).json({ userPets })
  }

  static async getAllUserAdoptions(req, res) {
    const token = getToken(req)
    const user = await getUserByToken(token)

    const userPets = await Pet.find({'adopter._id': user._id}).sort('-createdAt')

    res.status(200).json({ userPets })
  }

  static async getPetById(req, res) {
    const id = req.params.id

    if(!ObjectId.isValid(id)){
      res.status(422).json({ message: 'ID inválido' })
      return
    }

    const pet = await Pet.findOne({_id: id})
    if(!pet){
      res.status(404).json({ message: 'Pet não encontrado'})
    }

    res.status(200).json({ pet: pet})
  }

  static async removePetById(req, res) {
    const id = req.params.id

    if(!ObjectId.isValid(id)){
      res.status(422).json({ message: 'ID inválido' })
      return
    }

    const pet = await Pet.findOne({_id: id})
    if(!pet){
      res.status(404).json({ message: 'Pet não encontrado'})
      return
    }

    const token = getToken(req)
    const user = await getUserByToken(token)

    if(pet.user._id.toString() !== user._id) {
      res.status(422).json({ message: 'Houve um erro ao processar sua solicitação!'})
      return
    }

    await Pet.findByIdAndRemove(id)
    res.status(200).json({ message: 'Pet removido com sucesso!'})
  }

  static async updatePet(req, res) {
    const id = req.params.id
    const { name, age, weight, color } = req.body
    const available = true
    const images = req.files

    const token = getToken(req)
    const user = await getUserByToken(token)

    const pet = await Pet.findOne({ _id: id})
    if(!pet) {
      res.status(422).json({ message: 'Pet não existe!'})
    }

    // console.log(pet.user._id)
    // console.log(user._id)

    if(pet.user._id.toString() !== String(user._id)) {
      res.status(422).json({ message: 'Não é possivel alterar um pet que não o seu!'})
      return
    }

    const updatedData = {
      name: name,
      weight: weight,
      age: age,
      color: color,
      images: []
    }
    images.map(image => updatedData.images.push(image.filename))

    await Pet.findByIdAndUpdate(id, updatedData)

    res.status(200).json({ message: 'Pet atualizado com sucesso!'})
  }

  static async schedule(req, res) {
    const id = req.params.id

    const pet = await Pet.findById(id)
    if(!pet) {
      res.status(404).json({ message: 'Pet não encontrado!'})
      return
    }

    const token = getToken(req)
    const user = await getUserByToken(token)

    if(pet.user._id === String(user._id)) {
      res.status(404).json({ message: 'Você não pode agendar uma visita com o seu proprio pet!'})
      return
    }

    if(pet.adopter) {
      console.log("a")
      if(String(pet.adopter._id) === String(user._id)) {
        console.log("b")
        res.status(404).json({ message: 'Você já agendou uma visita com este Pet!'})
        return
      }
    }

    pet.adopter = {
      _id: user._id,
      name: user.name,
      image: user.image
    }

    await Pet.findByIdAndUpdate(id, pet)

    res.status(200).json({ message: `A visita foi agendada com sucesso, entre em contato com o ${pet.user.name} pelo telefone ${pet.user.phone}`})
    return
  }

  static async concludeAdoption(req, res) {
    const id = req.params.id

    const pet = await Pet.findById(id)
    if(!pet) {
      res.status(404).json({ message: 'Pet não encontrado!'})
    }

    const token = getToken(req)
    const user = await getUserByToken(token)

    if(pet.user._id === String(user._id)) {
      res.status(404).json({ message: 'Este é o seu proprio Pet!'})
      return
    }

    pet.available = false
    await Pet.findByIdAndUpdate(id, pet)

    res.status(200).json({message: 'Parabéns! O ciclo de adoção foi concluido com sucesso'})
  }
}