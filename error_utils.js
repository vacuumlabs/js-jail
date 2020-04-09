function create_jail_error(type, key) {
  const err = new Error('jail problem')
  err.sentinel = 'jail-problem'
  err.type = type
  err.key = key
  return err
}

module.exports = {create_jail_error}
