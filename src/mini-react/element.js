export const TEXT_ELEMENT_TYPE = Symbol.for('TEXT')

export const isValidElement = (element) => typeof element === 'object'

export const createTextElement = (text) => ({
  type: TEXT_ELEMENT_TYPE,
  props: {
    nodeValue: text,
  },
})

export const createElement = (type, props, children) => {
  const resolvedChildren = children.map((child) => {
    if (isValidElement(child)) {
      return child
    }

    return createTextElement(String(child))
  })

  return {
    type,
    props: {
      ...props,
      children: resolvedChildren,
    },
  }
}
