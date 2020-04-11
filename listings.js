const safe_Object_properties = [
  'length',
  'name',
  'is',
  'keys',
  'entries',
  'fromEntries',
  'values',
]

const safe_Array_prototype_properties = [
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

const safe_Object_prototype_properties = ['hasOwnProperty', 'toString', 'valueOf', 'toLocaleString']

const forbidden_instance_properties = ['__proto__', 'constructor', 'prototype']

const check_if_prop_is_forbidden_instance_property = (prop_name) =>
  forbidden_instance_properties.map((prop) => `${prop_name} === "${prop}"`).join(' || ')

module.exports = {
  safe_Object_properties,
  safe_Array_prototype_properties,
  safe_Object_prototype_properties,
  forbidden_instance_properties,
  check_if_prop_is_forbidden_instance_property,
}
