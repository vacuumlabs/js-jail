const create_jail_error_template = `(function (type, key) {
    const err = new Error('jail problem')
    err.sentinel = 'jail-problem'
    err.type = type
    err.key = key
    return err
  })
`

const create_jail_error = eval(create_jail_error_template)

module.exports = {create_jail_error, create_jail_error_template}
