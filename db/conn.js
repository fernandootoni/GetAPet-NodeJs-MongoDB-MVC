const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/getapet')
  console.log('Conectou ao Mongoose!')
}

main().catch(err => console.error("Erro ao conectar com o mongoose " + err))

module.exports = mongoose