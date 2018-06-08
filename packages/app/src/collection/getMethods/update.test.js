import Collection from '../index'
import generateId from './generateId'
import Model from '../../Model'

it('updates a document without errors', async () => {
  const Tests = await new Collection({name: generateId(), passUpdateAndRemove: false}).await()

  const docId = await Tests.insert({hello: 'world'})
  const modifiedCount = await Tests.update(docId, {$set: {hello: 'country'}})
  expect(modifiedCount).toBe(1)
  const final = await Tests.findOne(docId)
  expect(final.hello).toBe('country')
})

it('updates multiple document without errors', async () => {
  const Tests = await new Collection({name: generateId(), passUpdateAndRemove: false}).await()

  await Tests.insert({hello: 'world'})
  await Tests.insert({hello: 'world'})
  const modifiedCount = await Tests.update({}, {$set: {hello: 'country'}}, {multi: true})
  expect(modifiedCount).toBe(2)
  const items = await Tests.find().toArray()
  for (const item of items) {
    expect(item.hello).toBe('country')
  }
})

it('should update documents that have array passing validation', async () => {
  const friend = {
    name: {type: String}
  }
  const schema = {
    _id: {type: 'ID'},
    friends: {type: [friend]}
  }
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({
    name: generateId(),
    passUpdateAndRemove: false,
    model
  }).await()

  const personId = await Tests.insert({friends: [{name: 'Roberto'}, {name: 'Joaquín'}]})

  await Tests.update(personId, {$set: {'friends.0.name': 'Robert'}})

  expect(await Tests.findOne(personId)).toEqual({
    _id: personId,
    friends: [{name: 'Robert'}, {name: 'Joaquín'}]
  })

  await Tests.update(personId, {$push: {friends: {name: 'Bastian'}}})
  expect(await Tests.findOne(personId)).toEqual({
    _id: personId,
    friends: [{name: 'Robert'}, {name: 'Joaquín'}, {name: 'Bastian'}]
  })
})

it('should update documents passing validation', async () => {
  const wife = {
    name: {type: String},
    state: {type: String}
  }
  const schema = {
    _id: {type: 'ID'},
    wife: {type: wife}
  }
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({
    name: generateId(),
    passUpdateAndRemove: false,
    model
  }).await()

  const personId = await Tests.insert({'wife.state': 'Hungry', 'wife.name': 'Francisca'})

  await Tests.update(personId, {$set: {'wife.state': 'Full'}})

  const doc = await Tests.findOne(personId)
  expect(doc).toEqual({_id: personId, wife: {state: 'Full', name: 'Francisca'}})
})

it('should update documents passing validation with blackbox field', async () => {
  const schema = {
    _id: {type: 'ID'},
    services: {type: 'blackbox'}
  }
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({
    name: generateId(),
    passUpdateAndRemove: false,
    model
  }).await()

  const personId = await Tests.insert({services: {password: 123456}})

  await Tests.update(personId, {$set: {'services.forgot': 'mypassword'}})

  const doc = await Tests.findOne(personId)
  expect(doc).toEqual({_id: personId, services: {password: 123456, forgot: 'mypassword'}})
})

it('should throw an error when modifier is invalid', async () => {
  const wife = {
    name: {type: String},
    state: {type: String}
  }
  const schema = {
    _id: {type: 'ID'},
    wife: {type: wife}
  }
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({
    name: generateId(),
    passUpdateAndRemove: false,
    model
  }).await()

  const personId = await Tests.insert({'wife.state': 'Hungry', 'wife.name': 'Francisca'})

  expect.assertions(1)
  try {
    await Tests.update(
      personId,
      {$set: {'wife.state': 'Full', 'mom.name': 'Paula'}},
      {clean: false}
    )
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})

it('dont add autovalue when updating', async () => {
  let index = 1
  const schema = {
    _id: {type: 'ID'},
    name: {
      type: String
    },
    count: {
      type: Number,
      autoValue(name) {
        return index++
      }
    }
  }
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({
    name: generateId(),
    passUpdateAndRemove: false,
    model
  }).await()

  const personId = await Tests.insert({name: 'Nicolás'})
  await Tests.update(personId, {$set: {name: 'Nicolás López'}})
  const doc = await Tests.findOne(personId)
  expect(doc).toEqual({_id: personId, name: 'Nicolás López', count: 1})
})