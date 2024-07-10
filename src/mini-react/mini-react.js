import { createElement } from './element'
import { render, workLoop, useState } from './render'

const bootstrap = () => {
  window.requestIdleCallback(workLoop)
}

bootstrap()

export const MiniReact = {
  createElement,
  render,
  useState,
}
