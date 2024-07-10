import { RESERVED_PROPS } from './constants'
import { TEXT_ELEMENT_TYPE } from './element'

export function updateDOM(DOM, prevProps, nextProps) {
  console.log('updateDOM', DOM, prevProps, nextProps)
  // remove old props
  for (const [prevPropKey, prevPropValue] of Object.entries(prevProps)) {
    if (RESERVED_PROPS.includes(prevPropKey)) {
      continue
    }

    if (prevPropKey.startsWith('on')) {
      const eventType = prevPropKey.slice(2).toLowerCase()
      DOM.removeEventListener(eventType, prevPropValue)
    } else {
      delete DOM[prevPropKey]
    }
  }

  // add new props
  for (const [nextPropKey, nextPropValue] of Object.entries(nextProps)) {
    if (RESERVED_PROPS.includes(nextPropKey)) {
      continue
    }

    if (nextPropKey.startsWith('on')) {
      const eventType = nextPropKey.slice(2).toLowerCase()
      DOM.addEventListener(eventType, nextPropValue)
    } else {
      DOM[nextPropKey] = nextPropValue
    }
  }
}

export function createDOM(fiberNode) {
  const { type, props } = fiberNode

  let DOM = null

  if (type === TEXT_ELEMENT_TYPE) {
    DOM = document.createTextNode('')
  } else if (typeof type === 'string') {
    DOM = document.createElement(type)
  }

  if (DOM !== null) {
    updateDOM(DOM, {}, props)
  }

  return DOM
}
