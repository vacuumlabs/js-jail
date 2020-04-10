const safe_object_properties = [
  'prototype',
  'length',
  'name',
  'is',
  'keys',
  'entries',
  'fromEntries',
  'values',
]

const safe_array_methods = [
  'length',
  'constructor',
  'concat',
  'find',
  'findIndex',
  'lastIndexOf',
  'slice',
  'reverse',
  'sort',
  'includes',
  'indexOf',
  'join',
  'keys',
  'entries',
  'values',
  'forEach',
  'filter',
  'flat',
  'flatMap',
  'map',
  'every',
  'some',
  'reduce',
  'reduceRight',
  'toLocaleString',
  'toString',
]

const forbidden_instance_properties = ['__proto__', 'constructor', 'prototype']

const check_if_prop_is_forbidden_instance_property = (prop_name) =>
  forbidden_instance_properties.map((prop) => `${prop_name} === "${prop}"`).join(' || ')

module.exports = {
  safe_object_properties,
  safe_array_methods,
  forbidden_instance_properties,
  check_if_prop_is_forbidden_instance_property,
}
